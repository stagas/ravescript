import { Sigui } from 'sigui'
import { fromEntries, getMemoryView, keys } from 'utils'
import { BUFFER_SIZE, MAX_LISTS, MAX_LITERALS } from '~/as/assembly/dsp/constants.ts'
import { DspBinaryOp } from '~/as/assembly/dsp/vm/dsp-shared.ts'
import { Op } from '~/generated/assembly/dsp-op.ts'
import { Gen, dspGens } from '~/generated/typescript/dsp-gens.ts'
import { createVm } from '~/generated/typescript/dsp-vm.ts'
import { AstNode, interpret } from '~/src/lang/interpreter.ts'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { parseNumber } from '~/src/lang/util.ts'
import { Clock } from './shared.ts'
import { getAllProps } from './util.ts'
import { Value } from './value.ts'
import { wasm } from './wasm.ts'

const DEBUG = false

const MAX_OPS = 4096

const dspGensKeys = keys(dspGens)

export type Dsp = ReturnType<typeof Dsp>
export type Sound = ReturnType<Dsp['Sound']>
export type SoundContext = ReturnType<typeof getContext>

function getContext() {
  return {
    gens: 0,
    values: 0,
    floats: 0,
    scalars: 0,
    audios: 0,
    literals: 0,
    literalsf: null as unknown as Float32Array,
    lists: 0,
    listsi: null as unknown as Int32Array,
  }
}

function copy<T extends Record<string, any>>(obj: T): T {
  return { ...obj }
}

let preTokens: Token[]
let postTokens: Token[]

export function Dsp({ sampleRate, core$ }: {
  sampleRate: number
  core$?: ReturnType<typeof wasm.createCore>
}) {
  using $ = Sigui()

  core$ ??= wasm.createCore(sampleRate)
  const pin = <T>(x: T): T => { wasm.__pin(+x); return x }
  const engine$ = wasm.createEngine(sampleRate, core$)
  const clock$ = wasm.getEngineClock(engine$)
  const clock = Clock(wasm.memory.buffer, clock$)

  const view = getMemoryView(wasm.memory)

  preTokens ??= [...tokenize({
    code:
      // we implicit call [nrate 1] before our code
      // so that the sample rate is reset.
      `[nrate 1]`
      // some builtin procedures
      + ` { .5* .5+ } norm= `
      + ` { at= p= sp= 1 [inc sp co* at] clip - p^ } dec= `
    // + `{ n= p= sp= 1 [inc sp co* t n*] clip - p^ } decay=`
    // + ` { t= p= sp= 1 [inc sp co* t] clip - p^ } down= `
  })]

  postTokens ??= [...tokenize({
    code: `@`
  })]

  function Sound() {
    const sound$ = pin(wasm.createSound(engine$))

    const context = getContext()

    const ops = wasm.alloc(Int32Array, MAX_OPS)
    const vm = createVm(ops)
    const setup_ops = wasm.alloc(Int32Array, MAX_OPS)
    const setup_vm = createVm(setup_ops)

    const lists$ = wasm.getSoundLists(sound$)
    const lists = view.getI32(lists$, MAX_LISTS)
    context.listsi = lists

    const literals$ = wasm.getSoundLiterals(sound$)
    const literals = view.getF32(literals$, MAX_LITERALS)
    const preset = createLiteralsPreset(literals)
    preset.set()

    function reset() {
      wasm.resetSound(sound$)
    }

    function prepare() {
      context.gens =
        context.audios =
        context.literals =
        context.floats =
        context.scalars =
        context.lists =
        context.values =
        0
    }

    function run() {
      wasm.dspRun(sound$, ops.ptr)
    }

    function commit() {
      vm.End()

      if (DEBUG) {
        let op$: Op
        let i = 0
        while (op$ = ops[i++]) {
          const op = Op[op$]
          const len = (vm as any)[op].length
          const slice = ops.subarray(i, i + len)
          console.log(op, ...slice)
          i += len
        }
      }
    }

    function setup() {
      setup_vm.CreateAudios(context.audios)
      setup_vm.CreateValues(context.values)
      setup_vm.End()
      wasm.dspRun(sound$, setup_ops.ptr)
    }

    function getAudio(index: number) {
      const ptr = wasm.getSoundAudio(sound$, index)
      const audio = view.getF32(ptr, BUFFER_SIZE)
      return audio
    }

    function createLiteralsPreset(
      literals: Float32Array = wasm.alloc(Float32Array, MAX_LITERALS)
    ) {
      function set() {
        context.literalsf = literals
        wasm.setSoundLiterals(sound$, literals.byteOffset)
      }
      return { literals, set }
    }

    function binaryOp(
      BinOp: DspBinaryOp,
      LiteralLiteral: (a: number, b: number) => number
    ): BinaryOp {
      return function binaryOp(lhs: Value | number, rhs: Value | number) {
        if (typeof lhs === 'number' && typeof rhs === 'number') {
          return LiteralLiteral(lhs, rhs)
        }

        const { Value } = sound

        let out = Value.Dynamic.create()

        let l: Value
        let r: Value

        if (commutative.has(BinOp)) {
          if (typeof lhs === 'number') {
            if (typeof rhs === 'number') throw 'unreachable'

            l = rhs
            r = Value.Literal.create(lhs)
          }
          else if (typeof rhs === 'number') {
            l = lhs
            r = Value.Literal.create(rhs)
          }
          else {
            l = lhs
            r = rhs
          }
        }
        else {
          if (typeof lhs === 'number') {
            if (typeof rhs === 'number') throw 'unreachable'

            l = Value.Literal.create(lhs)
            r = rhs
          }
          else if (typeof rhs === 'number') {
            l = lhs
            r = Value.Literal.create(rhs)
          }
          else {
            l = lhs
            r = rhs
          }
        }

        if (!l) {
          throw new Error('Missing left operand.')
        }

        if (!r) {
          throw new Error('Missing right operand.')
        }

        sound.vm.BinaryOp(
          BinOp,
          l.value$,
          r.value$,
          out.value$
        )

        return out
      } as BinaryOp
    }

    const soundPartial = {
      context,
      vm,
    }

    const math = {
      add: binaryOp(DspBinaryOp.Add, (a, b) => a + b),
      mul: binaryOp(DspBinaryOp.Mul, (a, b) => a * b),
      sub: binaryOp(DspBinaryOp.Sub, (a, b) => a - b),
      div: binaryOp(DspBinaryOp.Div, (a, b) => a / b),
      pow: binaryOp(DspBinaryOp.Pow, (a, b) => a ** b),
    }

    function defineGen(name: keyof Gen, stereo: boolean) {
      const props = getAllProps(name)
      const Gen = dspGens[name]
      const kind_index = dspGensKeys.indexOf(name)

      function handle(opt: Record<string, unknown>) {
        const gen$ = context.gens++
        setup_vm.CreateGen(kind_index)
        DEBUG && console.log('CreateGen', name, gen$)

        for (let p in opt) {
          const prop = `${name}.${p}`
          const prop$ = props.indexOf(p)
          DEBUG && console.log('Property', prop, opt[p])

          if (prop$ >= 0) {
            let value: number | undefined
            outer: {
              if (opt[p] instanceof Value) {
                const v: Value = opt[p]

                // Audio
                if (v.kind === Value.Kind.Audio) {
                  if (audioProps.has(p)) {
                    vm.SetProperty(gen$, prop$, Value.Kind.Audio, v.value$)
                  }
                  else {
                    const scalar = sound.Value.Scalar.create()
                    vm.AudioToScalar(v.ptr, scalar.ptr)
                    vm.SetProperty(gen$, prop$, Value.Kind.Scalar, scalar.value$)
                  }
                  break outer
                }
                else {
                  if (audioProps.has(p)) {
                    vm.SetProperty(gen$, prop$, Value.Kind.Audio, v.value$)
                  }
                  else {
                    vm.SetProperty(gen$, prop$, Value.Kind.Scalar, v.value$)
                  }
                  break outer
                }
              }
              // Text
              else if (typeof opt[p] === 'string') {
                if (name === 'say' && p === 'text') {
                  const floats = sound.Value.Floats.create()
                  const text = opt[p]
                  // loadSayText(floats, text)
                  vm.SetProperty(gen$, prop$, Value.Kind.Floats, floats.value$)
                  break outer
                }
                if (name === 'freesound' && p === 'id') {
                  const floats = sound.Value.Floats.create()
                  const text = opt[p]
                  // loadFreesound(floats, text)
                  vm.SetProperty(gen$, prop$, Value.Kind.Floats, floats.value$)
                  break outer
                }
                value = 0
              }
              // Literal
              else if (typeof opt[p] === 'number') {
                value = opt[p]
              }
              else {
                throw new TypeError(
                  `Invalid type for property "${prop}": ${typeof opt[p]}`)
              }

              if (typeof value !== 'number') {
                throw new TypeError(
                  `Invalid value for property "${prop}": ${value}`)
              }

              const literal = sound.Value.Literal.create(value)
              if (audioProps.has(p)) {
                const audio = sound.Value.Audio.create()
                vm.LiteralToAudio(literal.ptr, audio.ptr)
                vm.SetProperty(gen$, prop$, Value.Kind.Audio, audio.value$)
              }
              else {
                vm.SetProperty(gen$, prop$, Value.Kind.Scalar, literal.value$)
              }
            }
          }
        }

        return gen$
      }

      function processMono(opt: Record<string, unknown>): Value | void {
        const gen$ = handle(opt)

        if ('hasAudioOut' in Gen && Gen.hasAudioOut) {
          const audio = sound.Value.Audio.create()
          vm.ProcessAudio(gen$, audio.ptr)
          return audio
        }
        else {
          vm.UpdateGen(gen$)
        }
      }

      function processStereo(opt: Record<string, unknown>): [Value, Value] | void {
        const gen$ = handle(opt)

        if ('hasStereoOut' in Gen && Gen.hasStereoOut) {
          const out_0 = sound.Value.Audio.create()
          const out_1 = sound.Value.Audio.create()
          vm.ProcessAudioStereo(gen$, out_0.ptr, out_1.ptr)
          return [out_0, out_1]
        }
        else {
          vm.UpdateGen(gen$)
        }
      }

      return stereo
        ? processStereo
        : processMono
    }

    const globals = {} as {
      sr: Value.Scalar
      t: Value.Scalar
      rt: Value.Scalar
      co: Value.Scalar
    }

    const api = {
      globals,
      math: {
        ...math,
        '+': math.add,
        '*': math.mul,
        '-': math.sub,
        '/': math.div,
        '^': math.pow,
      },
      pan(value: Value | number): void {
        if (typeof value === 'number') {
          value = sound.Value.Literal.create(value)
        }
        vm.Pan(value.value$)
      },
      pick<T extends Value | number>(values: T[], index: Value | number): Value {
        const list$ = context.lists

        const length = values.length
        context.lists += length

        let i = list$
        for (let v of values) {
          if (typeof v === 'number') {
            const literal = sound.Value.Literal.create(v)
            context.listsi[i++] = literal.value$
          }
          else {
            context.listsi[i++] = v.value$
          }
        }

        if (typeof index === 'number') {
          index = sound.Value.Literal.create(index)
        }

        const out = sound.Value.Dynamic.create()
        vm.Pick(list$, length, index.value$, out.value$)
        return out
      },
      gen: fromEntries(
        dspGensKeys.map(name =>
          [name, defineGen(name, false)]
        )
      ),
      gen_st: fromEntries(
        dspGensKeys.map(name =>
          [name, defineGen(name, true)]
        )
      )
    } as const

    let prevHashId: string

    function process(tokens: Token[]) {
      const scope = {} as any
      const literals: AstNode[] = []

      // fix invisible tokens bounds to the
      // last visible token for errors
      const last = tokens.at(-1)
      function fixToken(x: Token) {
        if (!last) return x
        x.line = last.line
        x.col = last.col
        x.right = last.right
        x.bottom = last.bottom
        x.index = last.index
        x.length = last.length
        return x
      }

      let tokensCopy = [
        ...preTokens.map(fixToken),
        ...tokens,
        ...postTokens.map(fixToken),
      ].filter(t => t.type !== Token.Type.Comment).map(copy)

      // create hash id from tokens. We compare this afterwards to determine
      // if we should make a new sound or update the old one.
      const hashId =
        [tokens.filter(t => t.type === Token.Type.Number).length].join('')
        + tokens.filter(t => [Token.Type.Id, Token.Type.Op].includes(t.type)).map(t => t.text).join('')

      const isNew = hashId !== prevHashId
      prevHashId = hashId

      // replace number tokens with literal references ids
      // and populate initial scope for those ids.
      for (const t of tokensCopy) {
        if (t.type === Token.Type.Number) {
          const id = `lit_${literals.length}`
          const literal = new AstNode(AstNode.Type.Literal, parseNumber(t.text), [t])
          literals.push(literal)
          scope[id] = literal
          t.type = Token.Type.Id
          t.text = id
        }
      }

      vm.Begin()
      setup_vm.Begin()
      prepare()
      if (isNew) {
        wasm.clearSound(sound$)
      }

      globals.sr = sound.Value.Scalar.create()
      globals.t = sound.Value.Scalar.create()
      globals.rt = sound.Value.Scalar.create()
      globals.co = sound.Value.Scalar.create()

      const { sr, t, rt, co } = globals
      scope.sr = new AstNode(AstNode.Type.Result, { value: sr })
      scope.t = new AstNode(AstNode.Type.Result, { value: t })
      scope.rt = new AstNode(AstNode.Type.Result, { value: rt })
      scope.co = new AstNode(AstNode.Type.Result, { value: co })

      for (let i = 0; i < 6; i++) {
        for (const p of 'nftv') {
          const name = `n${i}${p}`
          const value = (globals as any)[name] = sound.Value.Scalar.create()
          scope[name] = new AstNode(AstNode.Type.Result, { value })
        }
      }

      for (let i = 0; i < 6; i++) {
        const name = `p${i}`
        const value = (globals as any)[name] = sound.Value.Scalar.create()
        scope[name] = new AstNode(AstNode.Type.Result, { value })
      }

      const program = interpret(sound, scope, tokensCopy)

      let L = program.scope.vars['L']
      let R = program.scope.vars['R']
      let LR = program.scope.vars['LR']

      const slice = program.scope.stack.slice(-2)
      if (slice.length === 2) {
        R ??= slice.pop()!
        L ??= slice.pop()!
      }
      else if (slice.length === 1) {
        LR ??= slice.pop()!
      }

      const out = {
        L: L?.value as Value.Audio | undefined,
        R: R?.value as Value.Audio | undefined,
        LR: LR?.value as Value.Audio | undefined,
      }

      commit()

      if (isNew) {
        setup()
      }

      return {
        isNew,
        out,
        program,
      }
    }

    const sound = {
      api,
      commit,
      context,
      createLiteralsPreset,
      getAudio,
      ops,
      preset,
      process,
      reset,
      run,
      setup_ops,
      setup_vm,
      sound$,
      Value: Value.Factory(soundPartial),
      values: [] as Value[],
      vm,
    }

    return sound
  }

  return { engine$, core$, clock, Sound }
}

const commutative = new Set([DspBinaryOp.Add, DspBinaryOp.Mul])
const audioProps = new Set(['in', 'sidechain'])
const textProps = new Set(['text', 'id'])

export type BinaryOp = {
  (lhs: number, rhs: number): number
  (lhs: number, rhs: Value): Value
  (lhs: Value, rhs: number): Value
  (lhs: Value, rhs: Value): Value
}
