import { omit, rpc, toRing, wasmSourceMap } from 'utils'
import type { __AdaptedExports as WasmExports } from '~/as/build/dsp-nort.d.ts'
import hex from '~/as/build/dsp-nort.wasm?raw-hex'
import dspConfig from '~/asconfig-dsp-nort.json'
import { createDspWasm } from '~/src/as/dsp/dsp-wasm.ts'
import { Clock, DspWorkletMode } from '~/src/as/dsp/shared.ts'

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
      log: console.log,
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

  const dsp = createDspWasm(sampleRate, wasm, memory)

  return {
    wasm,
    memory,
    ...dsp,
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
