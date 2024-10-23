import { Sigui } from 'sigui'
import { getMemoryView, rpc, type MemoryView } from 'utils'
import { builds, getTokens, setupTracks } from '~/src/as/dsp/build.ts'
import { Clock, DspWorkletMode, Track } from '~/src/as/dsp/shared.ts'
import { DspWorklet, type DspProcessorOptions } from '~/src/as/dsp/worklet.ts'
import dspWorkletUrl from '~/src/as/dsp/worklet.ts?url'

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

export function createDspNode(ctx: AudioContext) {
  using $ = Sigui()

  const info = $({
    code: null as null | string,
    node: null as null | DspNode,
    dsp: null as null | Awaited<ReturnType<DspWorklet['setup']>>,
    view: null as null | MemoryView,
    clock: null as null | Clock,
    tracks: null as null | Track[],
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
      info.clock = Clock(dsp.memory.buffer, dsp.clock$)
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

  const hashes: Map<Track, string> = new Map()

  function build(code: string) {
    const { tracks, currTrack, nextTrack } = $.of(info)
    let track = tracks[currTrack]

    const { tokens, hashId } = getTokens(code.replaceAll('\n', '\r\n'))

    const prevHashId = hashes.get(track)
    const isNew = hashId !== prevHashId

    if (isNew) {
      track = tracks[info.currTrack = nextTrack]
      info.nextTrack = (nextTrack + 1) % tracks.length
      hashes.set(track, hashId)
    }

    const buildTrack = builds.get(track)!

    const { out } = buildTrack(tokens)

    track.audio_LR$ = out.LR?.audio$ || out.LR?.ptr || 0

    return { track$: track.ptr }
  }

  // setup tracks
  $.fx(() => {
    const { dsp } = $.of(info)
    $()
    const view = info.view = getMemoryView(dsp.memory)

    info.tracks = setupTracks(
      view,
      dsp.tracks$$,
      dsp.run_ops$$,
      dsp.setup_ops$$,
      dsp.literals$$,
      dsp.lists$$,
    )
  })

  // update player track
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
