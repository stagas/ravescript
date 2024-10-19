// @ts-ignore
self.document = {
  querySelectorAll() { return [] as any },
  baseURI: location.origin
}

import { Dsp, wasm } from 'dsp'
import { Lru, rpc } from 'utils'
import { tokenize } from '~/src/lang/tokenize.ts'
import { FRAME_SIZE } from '~/src/pages/DspWorkerDemo/constants'
import { FreeQueue } from '~/src/pages/DspWorkerDemo/free-queue'

export type DspWorker = typeof worker

const getFloats = Lru(10, (_key: string, length: number) => wasm.alloc(Float32Array, length), item => item.fill(0), item => item.free())

let epoch = 0

const worker = {
  async setup({ sampleRate, inputQueue, outputQueue, atomicState, cmd, state }: {
    sampleRate: number
    inputQueue: FreeQueue
    outputQueue: FreeQueue
    atomicState: Int32Array
    cmd: Uint8Array
    state: Uint8Array
  }) {
    console.log('[dsp-worker] setup')
    Object.setPrototypeOf(inputQueue, FreeQueue.prototype)
    Object.setPrototypeOf(outputQueue, FreeQueue.prototype)

    const dsp = Dsp({ sampleRate })
    const sounds = Array.from({ length: 4 }, () => dsp.Sound())

    let current = 0
    let sound = sounds[current++]

    // buffer for storing data pulled out from queue.
    const input = getFloats(`${FRAME_SIZE}:${epoch++}`, FRAME_SIZE)
    const output = getFloats(`${FRAME_SIZE}:${epoch++}`, FRAME_SIZE)
    const decoder = new TextDecoder()

    let LR: number = -1

    // loop for processing data.
    while (Atomics.wait(atomicState, 0, 0) === 'ok') {

      // pull data out from inputQueue.
      // const didPull = inputQueue.pull([input], FRAME_SIZE)

      // If pulling data out was successfull, process it and push it to
      // outputQueue
      if (outputQueue.getAvailableSamples() < FRAME_SIZE) {
        if (LR >= 0) {
          wasm.fillSound(
            sound.sound$,
            sound.ops.ptr,
            LR,
            0,
            output.length,
            output.ptr,
          )
        }

        outputQueue.push([output], FRAME_SIZE)
      }

      if (cmd[0]) {
        const code = decoder.decode(state.slice(0, cmd[0]))
        const tokens = Array.from(tokenize({ code }))
        // sound = sounds[current++ % sounds.length]
        const { out } = sound.process(tokens)
        if (out.LR) {
          LR = out.LR.getAudio()
        }
        cmd[0] = 0
      }

      if (outputQueue.getAvailableSamples() >= FRAME_SIZE) {
        Atomics.store(atomicState, 0, 0)
      }

      // outputQueue.printAvailableReadAndWrite()
    }
  },
}

const host = rpc<{ isReady(): void }>(self as any, worker)
host.isReady()
console.debug('[dsp-worker] started')
