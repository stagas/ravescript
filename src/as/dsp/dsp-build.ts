import { DEBUG, getAllProps, Value as ValueBase, type Value } from 'dsp'
import { fromEntries, keys, shallowCopy, type MemoryView } from 'utils'
import { MAX_LISTS, MAX_LITERALS, MAX_OPS } from '~/as/assembly/dsp/constants.ts'
import { DspBinaryOp } from '~/as/assembly/dsp/vm/dsp-shared.ts'
import { dspGens, type Gen } from '~/generated/typescript/dsp-gens.ts'
import { createVm, type DspVm } from '~/generated/typescript/dsp-vm.ts'
import { postTokens, preTokens } from '~/src/as/dsp/pre-post.ts'
import { Track } from '~/src/as/dsp/shared.ts'
import { AstNode, interpret } from '~/src/lang/interpreter.ts'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { parseNumber } from '~/src/lang/util.ts'

const dspGensKeys = keys(dspGens)

type GenApi = {
  (opt: Record<string, unknown>): Value | [Value, Value] | void
}

type BinaryOp = {
  (lhs: number, rhs: number): number
  (lhs: number, rhs: Value): Value
  (lhs: Value, rhs: number): Value
  (lhs: Value, rhs: Value): Value
}

export interface DspApi {
  globals: Record<string, Value.Scalar>
  math: Record<string, BinaryOp>
  gen: Record<string, GenApi>
  gen_st: Record<string, GenApi>
  pan(value: Value | number): void
  pick<T extends Value | number>(values: T[], index: Value | number): Value
}

const commutative = new Set([DspBinaryOp.Add, DspBinaryOp.Mul])
const audioProps = new Set(['in', 'sidechain'])
const textProps = new Set(['text', 'id'])

export type TrackContext = ReturnType<typeof getTrackContext>

export function getTrackContext(view: MemoryView, track: Track) {
  const literalsf = view.getF32(track.literals$, MAX_LITERALS)
  const listsi = view.getI32(track.lists$, MAX_LISTS)
  return {
    gens: 0,
    values: 0,
    floats: 0,
    scalars: 0,
    audios: 0,
    literals: 0,
    literalsf,
    lists: 0,
    listsi,
  }
}

const vms: Map<Track, { runVm: DspVm, setupVm: DspVm }> = new Map()
const contexts: Map<Track, ReturnType<typeof getTrackContext>> = new Map()
export const builds: Map<Track, TrackBuild> = new Map()

export type TrackBuild = ReturnType<typeof TrackBuild>

export function TrackBuild(track: Track) {
  const { runVm, setupVm } = vms.get(track)!
  const context = contexts.get(track)!
  const Value = ValueBase.Factory({ context, vm: runVm })

  function binaryOp(
    BinOp: DspBinaryOp,
    LiteralLiteral: (a: number, b: number) => number
  ): BinaryOp {
    return function binaryOp(lhs: Value | number, rhs: Value | number) {
      if (typeof lhs === 'number' && typeof rhs === 'number') {
        return LiteralLiteral(lhs, rhs)
      }

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

      runVm.BinaryOp(
        BinOp,
        l.value$,
        r.value$,
        out.value$
      )

      return out
    } as BinaryOp
  }

  function defineGen(name: keyof Gen, stereo: boolean) {
    const props = getAllProps(name)
    const Gen = dspGens[name]
    const kind_index = dspGensKeys.indexOf(name)

    function handle(opt: Record<string, unknown>) {
      const gen$ = context.gens++
      setupVm.CreateGen(kind_index)
      DEBUG && console.log('CreateGen', name, gen$)

      for (let p in opt) {
        const prop = `${name}.${p}`
        const prop$ = props.indexOf(p)
        DEBUG && console.log('Property', prop, opt[p])

        if (prop$ >= 0) {
          let value: number | undefined
          outer: {
            if (opt[p] instanceof ValueBase) {
              const v: Value = opt[p]

              // Audio
              if (v.kind === ValueBase.Kind.Audio) {
                if (audioProps.has(p)) {
                  runVm.SetProperty(gen$, prop$, ValueBase.Kind.Audio, v.value$)
                }
                else {
                  const scalar = Value.Scalar.create()
                  runVm.AudioToScalar(v.ptr, scalar.ptr)
                  runVm.SetProperty(gen$, prop$, ValueBase.Kind.Scalar, scalar.value$)
                }
                break outer
              }
              else {
                if (audioProps.has(p)) {
                  runVm.SetProperty(gen$, prop$, ValueBase.Kind.Audio, v.value$)
                }
                else {
                  runVm.SetProperty(gen$, prop$, ValueBase.Kind.Scalar, v.value$)
                }
                break outer
              }
            }
            // Text
            else if (typeof opt[p] === 'string') {
              if (name === 'say' && p === 'text') {
                const floats = Value.Floats.create()
                const text = opt[p]
                // loadSayText(floats, text)
                runVm.SetProperty(gen$, prop$, ValueBase.Kind.Floats, floats.value$)
                break outer
              }
              if (name === 'freesound' && p === 'id') {
                const floats = Value.Floats.create()
                const text = opt[p]
                // loadFreesound(floats, text)
                runVm.SetProperty(gen$, prop$, ValueBase.Kind.Floats, floats.value$)
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

            const literal = Value.Literal.create(value)
            if (audioProps.has(p)) {
              const audio = Value.Audio.create()
              runVm.LiteralToAudio(literal.ptr, audio.ptr)
              runVm.SetProperty(gen$, prop$, ValueBase.Kind.Audio, audio.value$)
            }
            else {
              runVm.SetProperty(gen$, prop$, ValueBase.Kind.Scalar, literal.value$)
            }
          }
        }
      }

      return gen$
    }

    function processMono(opt: Record<string, unknown>): Value | void {
      const gen$ = handle(opt)

      if ('hasAudioOut' in Gen && Gen.hasAudioOut) {
        const audio = Value.Audio.create()
        runVm.ProcessAudio(gen$, audio.ptr)
        return audio
      }
      else {
        runVm.UpdateGen(gen$)
      }
    }

    function processStereo(opt: Record<string, unknown>): [Value, Value] | void {
      const gen$ = handle(opt)

      if ('hasStereoOut' in Gen && Gen.hasStereoOut) {
        const out_0 = Value.Audio.create()
        const out_1 = Value.Audio.create()
        runVm.ProcessAudioStereo(gen$, out_0.ptr, out_1.ptr)
        return [out_0, out_1]
      }
      else {
        runVm.UpdateGen(gen$)
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

  const math = {
    add: binaryOp(DspBinaryOp.Add, (a, b) => a + b),
    mul: binaryOp(DspBinaryOp.Mul, (a, b) => a * b),
    sub: binaryOp(DspBinaryOp.Sub, (a, b) => a - b),
    div: binaryOp(DspBinaryOp.Div, (a, b) => a / b),
    pow: binaryOp(DspBinaryOp.Pow, (a, b) => a ** b),
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
        value = Value.Literal.create(value)
      }
      runVm.Pan(value.value$)
    },
    pick<T extends Value | number>(values: T[], index: Value | number): Value {
      const list$ = context.lists

      const length = values.length
      context.lists += length

      let i = list$
      for (let v of values) {
        if (typeof v === 'number') {
          const literal = Value.Literal.create(v)
          context.listsi[i++] = literal.value$
        }
        else {
          context.listsi[i++] = v.value$
        }
      }

      if (typeof index === 'number') {
        index = Value.Literal.create(index)
      }

      const out = Value.Dynamic.create()
      runVm.Pick(list$, length, index.value$, out.value$)
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
  }

  function begin(scope: Record<string, AstNode>) {
    runVm.Begin()
    setupVm.Begin()

    context.gens =
      context.audios =
      context.literals =
      context.floats =
      context.scalars =
      context.lists =
      context.values =
      0

    globals.sr = Value.Scalar.create()
    globals.t = Value.Scalar.create()
    globals.rt = Value.Scalar.create()
    globals.co = Value.Scalar.create()

    const { sr, t, rt, co } = globals
    scope.sr = new AstNode(AstNode.Type.Result, { value: sr })
    scope.t = new AstNode(AstNode.Type.Result, { value: t })
    scope.rt = new AstNode(AstNode.Type.Result, { value: rt })
    scope.co = new AstNode(AstNode.Type.Result, { value: co })
  }

  function buildTrack(tokensCopy: Token[]) {
    const scope: Record<string, AstNode> = {}
    const literals: AstNode[] = []

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

    begin(scope)

    const program = interpret(api, scope, tokensCopy)

    runVm.End()

    setupVm.CreateAudios(context.audios)
    setupVm.CreateValues(context.values)
    setupVm.End()

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

    return { program, out }
  }

  return buildTrack
}

export function setupTracks(
  view: MemoryView,
  tracks$$: number[],
  run_ops$$: number[],
  setup_ops$$: number[],
  literals$$: number[],
  lists$$: number[],
) {
  const tracks = tracks$$.map(ptr =>
    Track(view.memory.buffer, ptr)
  )

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    track.run_ops$ = run_ops$$[i]
    track.setup_ops$ = setup_ops$$[i]
    track.literals$ = literals$$[i]
    track.lists$ = lists$$[i]

    const run_ops = view.getI32(track.run_ops$, MAX_OPS)
    const setup_ops = view.getI32(track.setup_ops$, MAX_OPS)
    vms.set(track, {
      runVm: createVm(run_ops),
      setupVm: createVm(setup_ops),
    })

    contexts.set(track, getTrackContext(view, track))
    builds.set(track, TrackBuild(track))
  }

  return tracks
}

export function getTokens(code: string) {
  const tokens = Array.from(tokenize({ code: code.replaceAll('\n', '\r\n') }))

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
    x.length = -1
    return x
  }

  const tokensCopy = [
    ...preTokens.map(fixToken),
    ...tokens,
    ...postTokens.map(fixToken),
  ].filter(t => t.type !== Token.Type.Comment).map(shallowCopy)

  // create hash id from tokens. We compare this afterwards to determine
  // if we should make a new sound or update the old one.
  const hashId = ''
    + [tokens.filter(t => t.type === Token.Type.Number).length].join('')
    + tokens.filter(t => [Token.Type.Id, Token.Type.Op].includes(t.type)).map(t => t.text).join('')

  return { tokens: tokensCopy, hashId }
}
