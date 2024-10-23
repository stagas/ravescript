import { Sigui } from 'sigui'
import { BUFFER_SIZE } from '~/as/assembly/pkg/constants.ts'
import { Out as OutType } from '~/as/assembly/pkg/shared.ts'
import { Out, PlayerMode } from '~/src/as/pkg/shared.ts'
import wasm from '~/src/as/pkg/wasm.ts'
import type { PlayerProcessorOptions } from '~/src/as/pkg/worklet.ts'
import playerWorkletUrl from '~/src/as/pkg/worklet.ts?url'

export class PlayerNode extends AudioWorkletNode {
  constructor(
    context: AudioContext,
    player$: number,
    out$: number,
    sourcemapUrl: string,
    public mode = new Uint8Array(new SharedArrayBuffer(1))
  ) {
    super(context, 'player', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      processorOptions: <PlayerProcessorOptions>{
        sourcemapUrl,
        memory: wasm.memory,
        mode,
        player$,
        out$,
      }
    })
  }
  get isPlaying() {
    return this.mode[0] === PlayerMode.Play
  }
  get isPaused() {
    return this.mode[0] === PlayerMode.Pause
  }
  reset() {
    this.mode[0] = PlayerMode.Reset
  }
  stop() {
    this.mode[0] = PlayerMode.Stop
  }
  play() {
    if (this.context.state === 'suspended') {
      (this.context as any).resume()
    }
    this.mode[0] = PlayerMode.Play
  }
  pause() {
    this.mode[0] = PlayerMode.Pause
  }
}

export type Player = ReturnType<typeof Player>

const registeredContexts = new Set<BaseAudioContext>()

export function Player(ctx: AudioContext) {
  using $ = Sigui()
  const pin = <T>(x: T): T => { wasm.__pin(+x); return x }

  // const view = getMemoryView(wasm.memory)
  const player$ = wasm.createPlayer(ctx.sampleRate)

  const out = Out(wasm.memory.buffer, wasm.createOut()) satisfies OutType
  const L = wasm.alloc(Float32Array, BUFFER_SIZE)
  const R = wasm.alloc(Float32Array, BUFFER_SIZE)
  out.L$ = L.ptr
  out.R$ = R.ptr

  const info = $({
    isPlaying: false,
    isPaused: false,
    didPlay: false,
    node: null as null | PlayerNode
  })

  function createNode() {
    const sourcemapUrl = new URL('/as/build/pkg-nort.wasm.map', location.origin).href
    const node = new PlayerNode(ctx, +player$, out.ptr, sourcemapUrl)
    node.connect(ctx.destination)
    info.node = node
  }

  if (!registeredContexts.has(ctx)) {
    registeredContexts.add(ctx)
    ctx.audioWorklet
      .addModule(playerWorkletUrl)
      .then(createNode)
  }
  else {
    createNode()
  }

  const off = $.fx(() => {
    if (info.isPlaying) {
      $()
      info.didPlay = true
      queueMicrotask(() => off())
    }
  })

  function updateInfo() {
    info.isPlaying = info.node?.isPlaying ?? false
    info.isPaused = info.node?.isPaused ?? false
  }

  function stop() {
    if (info.node?.isPlaying) {
      info.node?.stop()
    }
    updateInfo()
  }

  function play() {
    info.node?.play()
    updateInfo()
  }

  function pause() {
    info.node?.pause()
    updateInfo()
  }

  function destroy() {
    info.node?.disconnect()
    info.node = null
  }

  return {
    info,
    out: { view: out, L, R },
    stop,
    play,
    pause,
    destroy,
  }
}
