import { getMemoryView, omit, rpc, toRing, wasmSourceMap } from 'utils'
import { BUFFER_SIZE, MAX_RMSS, MAX_TRACKS } from '~/as/assembly/dsp/constants.ts'
import type { __AdaptedExports as WasmExports } from '~/as/build/dsp-nort.d.ts'
import hex from '~/as/build/dsp-nort.wasm?raw-hex'
import dspConfig from '~/asconfig-dsp-nort.json'
import { Clock, DspWorkletMode, Out } from '~/src/as/dsp/shared.ts'

type AudioProcess = (inputs: Float32Array[], outputs: Float32Array[]) => void

export interface DspProcessorOptions {
  mode: Uint8Array
}

interface SetupOptions {
  sourcemapUrl: string
}

type Setup = Awaited<ReturnType<typeof setup>>
async function setup({ sourcemapUrl }: SetupOptions) {
  const fromHexString = (hexString: string) => Uint8Array.from(
    hexString.match(/.{1,2}/g)!.map(byte =>
      parseInt(byte, 16)
    )
  )
  const uint8 = fromHexString(hex)
  const buffer = wasmSourceMap.setSourceMapURL(uint8.buffer, sourcemapUrl)
  const binary = new Uint8Array(buffer)

  const memory = new WebAssembly.Memory({
    initial: dspConfig.options.initialMemory,
    maximum: dspConfig.options.maximumMemory,
    shared: dspConfig.options.sharedMemory,
  })
  const mod = await WebAssembly.compile(binary)
  const instance = await WebAssembly.instantiate(mod, {
    env: {
      memory,
      abort(message$: number, fileName$: number, lineNumber$: number, columnNumber$: number) {
        const message = __liftString(message$ >>> 0)
        const fileName = __liftString(fileName$ >>> 0)
        const lineNumber = lineNumber$ >>> 0
        const columnNumber = columnNumber$ >>> 0
        throw new Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`)
      },
      'console.log': (textPtr: number) => {
        console.log(__liftString(textPtr))
      }
    }
  })
  function __liftString(pointer: number) {
    if (!pointer) return null
    const
      end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
      memoryU16 = new Uint16Array(memory.buffer)
    let
      start = pointer >>> 1,
      string = ""
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024))
    return string + String.fromCharCode(...memoryU16.subarray(start, end))
  }

  const wasm: typeof WasmExports = instance.exports as any

  const view = getMemoryView(memory)

  const core$ = wasm.createCore(sampleRate)
  const engine$ = wasm.createEngine(sampleRate, core$)
  const clock$ = wasm.getEngineClock(engine$)

  const sound$ = wasm.createSound(engine$)

  const out$ = wasm.createOut()
  const out = Out(memory.buffer, out$)
  const L$ = wasm.allocF32(BUFFER_SIZE)
  const R$ = wasm.allocF32(BUFFER_SIZE)
  out.L$ = L$
  out.R$ = R$
  const L = view.getF32(out.L$, BUFFER_SIZE)
  const R = view.getF32(out.R$, BUFFER_SIZE)

  const player$ = wasm.createPlayer(sound$, out$)
  const player_track$ = player$ + wasm.getPlayerTrackOffset()
  const player_audios$$ = Array.from({ length: MAX_RMSS }, (_, index) => wasm.getSoundAudio(sound$, index))
  const tracks$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createTrack())
  const run_ops$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createOps())
  const setup_ops$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createOps())
  const literals$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createLiterals())
  const lists$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createLists())

  // TODO: preallocate audios and return here their pointers
  return {
    wasm,
    memory,
    clock$,
    L,
    R,
    player$,
    player_track$,
    player_audios$$,
    tracks$$,
    run_ops$$,
    setup_ops$$,
    literals$$,
    lists$$,
  }
}

async function createDspKernel(processor: DspProcessor, setup: Setup) {
  const { mode } = processor.options.processorOptions
  const { wasm, memory, clock$, L, R, player$ } = setup
  const clock = Clock(memory.buffer, clock$)

  const chunkSize = 128

  const ring_L = toRing(L, chunkSize)
  const ring_R = toRing(R, chunkSize)

  let begin: number = 0
  let end: number = chunkSize

  const next = () => {
    clock.ringPos = clock.nextRingPos
    clock.nextRingPos = (clock.ringPos + 1) % ring_L.length
    begin = clock.ringPos * chunkSize
    end = (clock.ringPos + 1) * chunkSize
    ring_L[clock.ringPos].fill(0)
    ring_R[clock.ringPos].fill(0)

    wasm.clockUpdate(clock$)
  }

  let inputs: Float32Array[]
  let outputs: Float32Array[]

  const writeOutput = () => {
    outputs[0]?.set(ring_L[clock.ringPos])
    outputs[1]?.set(ring_R[clock.ringPos])
  }

  function setMode(m: DspWorkletMode) {
    mode[0] = m
  }

  const modes: { [K in DspWorkletMode]: () => void } = {
    [DspWorkletMode.Idle]() {
      // wasm.playerProcess(player$, 0, 0)
    },
    [DspWorkletMode.Reset]() {
      next()
      wasm.playerProcess(player$, begin, end)
      writeOutput()
      wasm.clockReset(clock$)
      setMode(DspWorkletMode.Play)
    },
    [DspWorkletMode.Stop]() {
      next()
      wasm.playerProcess(player$, begin, end)
      writeOutput()
      wasm.clockReset(clock$)
      setMode(DspWorkletMode.Idle)
    },
    [DspWorkletMode.Play]() {
      next()
      wasm.playerProcess(player$, begin, end)
      writeOutput()
    },
    [DspWorkletMode.Pause]() {
      next()
      wasm.playerProcess(player$, begin, end)
      writeOutput()
      setMode(DspWorkletMode.Idle)
    },
  }

  const kernel: { player$: number, process: AudioProcess } = {
    player$,
    process: (_inputs, _outputs) => {
      inputs = _inputs
      outputs = _outputs
      modes[<DspWorkletMode>mode[0]]()
    }
  }

  return kernel
}

export class DspWorklet {
  kernel?: Awaited<ReturnType<typeof createDspKernel>>

  constructor(public processor: DspProcessor) { }

  process: AudioProcess = () => { }

  async setup(options: SetupOptions) {
    const dspSetup = await setup(options)
    await this.init(dspSetup)
    console.log('[dsp-worklet] ready')
    return omit(dspSetup, ['wasm'])
  }

  async init(dspSetup: Setup) {
    this.kernel = await createDspKernel(this.processor, dspSetup)
    this.process = this.kernel.process
  }
}

export class DspProcessor extends AudioWorkletProcessor {
  worklet: DspWorklet = new DspWorklet(this)

  constructor(public options: { processorOptions: DspProcessorOptions }) {
    super()
    rpc(this.port, this.worklet)
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    this.worklet.process(inputs[0], outputs[0])
    return true
  }
}

registerProcessor('dsp', DspProcessor)
