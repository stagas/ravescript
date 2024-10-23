import { FRAME_SIZE } from "./constants.ts"
import { FreeQueue } from "./free-queue.ts"

/**
 * Worker message event handler.
 * This will initialize worker with FreeQueue instance and set loop for audio
 * processing.
 */
self.onmessage = (msg) => {
  if (msg.data.type === "init") {
    let { inputQueue, outputQueue, atomicState, cmd, state } = msg.data.data as {
      inputQueue: FreeQueue
      outputQueue: FreeQueue
      atomicState: Int32Array
      cmd: Uint8Array
      state: Uint8Array
    }
    Object.setPrototypeOf(inputQueue, FreeQueue.prototype)
    Object.setPrototypeOf(outputQueue, FreeQueue.prototype)

    // buffer for storing data pulled out from queue.
    const input = new Float32Array(FRAME_SIZE)

    let hz = 300
    let phase = 0
    let t = 0
    const decoder = new TextDecoder()
    // loop for processing data.
    while (Atomics.wait(atomicState, 0, 0) === 'ok') {

      // pull data out from inputQueue.
      const didPull = inputQueue.pull([input], FRAME_SIZE)

      if (didPull) {
        // If pulling data out was successfull, process it and push it to
        // outputQueue
        const output = input.map(() => {
          const s = Math.sin(phase) * 0.2
          phase += (1 / 48000) * hz * Math.PI * 2
          return s
        })
        outputQueue.push([output], FRAME_SIZE)
      }

      if (cmd[0]) {
        const st = JSON.parse(decoder.decode(state.slice(0, cmd[0]))) as { hz: number }
        hz = st.hz
        // console.log('set hz', hz)
        cmd[0] = 0
      }

      // }

      Atomics.store(atomicState, 0, 0)
    }
  }
}
