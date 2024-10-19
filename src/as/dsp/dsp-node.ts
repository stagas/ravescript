import { DEBUG, getAllProps, Value as ValueBase, type Value } from 'dsp'
import { Sigui } from 'sigui'
import { fromEntries, getMemoryView, keys, rpc, shallowCopy, type MemoryView } from 'utils'
import { MAX_LISTS, MAX_LITERALS, MAX_OPS } from '~/as/assembly/dsp/constants.ts'
import { DspBinaryOp } from '~/as/assembly/dsp/vm/dsp-shared.ts'
import { dspGens, type Gen } from '~/generated/typescript/dsp-gens.ts'
import { createVm, type DspVm } from '~/generated/typescript/dsp-vm.ts'
import { DspWorklet, type DspProcessorOptions } from '~/src/as/dsp/dsp-worklet.ts'
import dspWorkletUrl from '~/src/as/dsp/dsp-worklet.ts?url'
import { DspWorkletMode, Track } from '~/src/as/dsp/shared.ts'
import { AstNode, interpret } from '~/src/lang/interpreter.ts'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { parseNumber } from '~/src/lang/util.ts'

const dspGensKeys = keys(dspGens)

export class DspNode extends AudioWorkletNode {
  constructor(
    context: AudioContext,
    public mode = new Uint8Array(new SharedArrayBuffer(1))
  ) {
    super(context, 'dsp', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      processorOptions: {
        mode,
      } satisfies DspProcessorOptions
    })
  }
  get isPlaying() {
    return this.mode[0] === DspWorkletMode.Play
  }
  get isPaused() {
    return this.mode[0] === DspWorkletMode.Pause
  }
  reset() {
    this.mode[0] = DspWorkletMode.Reset
  }
  stop() {
    this.mode[0] = DspWorkletMode.Stop
  }
  play() {
    if (this.context.state === 'suspended') {
      (this.context as any).resume()
    }
    this.mode[0] = DspWorkletMode.Play
  }
  pause() {
    this.mode[0] = DspWorkletMode.Pause
  }
}

const registeredContexts = new Set<BaseAudioContext>()

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

export function createDspNode(ctx: AudioContext) {
  using $ = Sigui()

  const info = $({
    node: null as null | DspNode,
    dsp: null as null | Awaited<ReturnType<DspWorklet['setup']>>,
    view: null as null | MemoryView,
    tracks: null as null | Track[],
    code: null as null | string,
    currTrack: 0,
    nextTrack: 1,
    isPlaying: false,
    isPaused: false,
  })

  async function createNode() {
    const node = new DspNode(ctx)
    const worklet = rpc<DspWorklet>(node.port)
    const sourcemapUrl = new URL('/as/build/dsp-nort.wasm.map', location.origin).href
    const dsp = await worklet.setup({ sourcemapUrl })
    $.batch(() => {
      info.node = node
      info.dsp = dsp
    })
    node.connect(ctx.destination)
  }

  if (!registeredContexts.has(ctx)) {
    registeredContexts.add(ctx)
    ctx.audioWorklet
      .addModule(dspWorkletUrl)
      .then(createNode)
  }
  else {
    createNode()
  }

  const preTokens = Array.from(tokenize({
    // we implicit call [nrate 1] before our code
    // so that the sample rate is reset.
    code: `[nrate 1]`
      // some builtin procedures
      // + ` { .5* .5+ } norm= `
      // + ` { at= p= sp= 1 [inc sp co* at] clip - p^ } dec= `
      + ` [zero] `
  }))

  const postTokens = Array.from(tokenize({
    code: `@`
  }))

  function getTrackContext(track: Track) {
    const { view } = $.of(info)
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
  const builds: Map<Track, ReturnType<typeof TrackBuild>> = new Map()
  const hashes: Map<Track, string> = new Map()

  function TrackBuild(track: Track) {
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

      return program
    }

    return buildTrack
  }

  function build(code: string) {
    const { tracks, currTrack, nextTrack } = $.of(info)
    let track = tracks[currTrack]

    const tokens = Array.from(tokenize({ code }))

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

    const tokensCopy = [
      ...preTokens.map(fixToken),
      ...tokens,
      ...postTokens.map(fixToken),
    ].filter(t => t.type !== Token.Type.Comment).map(shallowCopy)

    // create hash id from tokens. We compare this afterwards to determine
    // if we should make a new sound or update the old one.
    const hashId =
      [tokens.filter(t => t.type === Token.Type.Number).length].join('')
      + tokens.filter(t => [Token.Type.Id, Token.Type.Op].includes(t.type)).map(t => t.text).join('')

    const prevHashId = hashes.get(track)
    const isNew = hashId !== prevHashId

    if (isNew) {
      track = tracks[nextTrack]
      hashes.set(track, hashId)
    }

    const buildTrack = builds.get(track)!

    const program = buildTrack(tokensCopy)

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

    track.audio_LR$ = out.LR?.audio$ ?? out.LR?.ptr ?? 0

    info.nextTrack = (nextTrack + 1) % tracks.length

    return { track$: track.ptr }
  }

  $.fx(() => {
    const { dsp } = $.of(info)
    $()
    const view = info.view = getMemoryView(dsp.memory)

    const tracks = info.tracks = dsp.tracks$$.map(ptr =>
      Track(dsp.memory.buffer, ptr)
    )

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      track.run_ops$ = dsp.run_ops$$[i]
      track.setup_ops$ = dsp.setup_ops$$[i]
      track.literals$ = dsp.literals$$[i]
      track.lists$ = dsp.lists$$[i]

      const run_ops = view.getI32(track.run_ops$, MAX_OPS)
      const setup_ops = view.getI32(track.setup_ops$, MAX_OPS)
      vms.set(track, {
        runVm: createVm(run_ops),
        setupVm: createVm(setup_ops),
      })

      contexts.set(track, getTrackContext(track))
      builds.set(track, TrackBuild(track))
    }
  })

  $.fx(() => {
    const { dsp, view, code } = $.of(info)
    $()
    const { track$ } = build(code)
    view.heapI32[dsp.player_track$ >> 2] = track$
  })

  function updateInfo() {
    info.isPlaying = info.node?.isPlaying ?? false
    info.isPaused = info.node?.isPaused ?? false
  }

  function play() {
    info.node?.play()
    updateInfo()
  }

  function pause() {
    info.node?.pause()
    updateInfo()
  }

  function stop() {
    if (info.node?.isPlaying) {
      info.node?.stop()
    }
    updateInfo()
  }

  function dispose() {
    stop()
    info.node?.disconnect()
    info.node = null
  }

  return { info, play, pause, stop, dispose }
}
