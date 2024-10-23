import { Sigui } from 'sigui'
import basicProcessorUrl from '~/src/pages/WorkerWorklet/basic-processor.ts?url'
import { QUEUE_SIZE } from '~/src/pages/WorkerWorklet/constants.ts'
import { FreeQueue } from '~/src/pages/WorkerWorklet/free-queue.ts'
import WorkerFactory from '~/src/pages/WorkerWorklet/worker.ts?worker'
import { H2 } from '~/src/ui/Heading.tsx'
import { Input } from '~/src/ui/Input.tsx'

export function WorkerWorkletDemo() {
  using $ = Sigui()

  const inputQueue = new FreeQueue(QUEUE_SIZE, 1)
  const outputQueue = new FreeQueue(QUEUE_SIZE, 1)
  // Create an atomic state for synchronization between worker and AudioWorklet.
  const atomicState = new Int32Array(new SharedArrayBuffer(1 * Int32Array.BYTES_PER_ELEMENT))
  const cmd = new Uint8Array(new SharedArrayBuffer(1 * Uint8Array.BYTES_PER_ELEMENT))
  const state = new Uint8Array(new SharedArrayBuffer(128 * Uint8Array.BYTES_PER_ELEMENT))

  const worker = new WorkerFactory()
  worker.postMessage({
    type: 'init',
    data: {
      inputQueue,
      outputQueue,
      atomicState,
      cmd,
      state,
    }
  })

  const audioContext = new AudioContext({ latencyHint: 0.000001 })
  $.fx(() => {
    $().then(async () => {
      await audioContext.audioWorklet.addModule(basicProcessorUrl)

      const processorNode = new AudioWorkletNode(audioContext, 'basic-processor', {
        processorOptions: {
          inputQueue,
          outputQueue,
          atomicState,
        }
      })

      const osc = new OscillatorNode(audioContext)
      osc.connect(processorNode).connect(audioContext.destination)
    })
  })

  return <div>
    <H2>Worker-Worklet Demo</H2>
    <Input value="300" type="range" min="200" max="400" oninput={e => {
      const hz = (e.target as HTMLInputElement).valueAsNumber
      const encoded = new TextEncoder().encode(JSON.stringify({ hz }))
      state.set(encoded)
      cmd[0] = encoded.byteLength
    }} />
  </div>
}
