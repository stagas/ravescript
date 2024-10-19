import { FRAME_SIZE, RENDER_QUANTUM } from '~/src/pages/WorkerWorklet/constants.ts'
import { FreeQueue } from '~/src/pages/WorkerWorklet/free-queue.ts'

/**
 * A simple AudioWorkletProcessor node.
 *
 * @class BasicProcessor
 * @extends AudioWorkletProcessor
 */
class BasicProcessor extends AudioWorkletProcessor {
  inputQueue: FreeQueue
  outputQueue: FreeQueue
  atomicState: Int32Array

  /**
   * Constructor to initialize, input and output FreeQueue instances
   * and atomicState to synchronise Worker with AudioWorklet
   * @param {Object} options AudioWorkletProcessor options
   *    to initialize inputQueue, outputQueue and atomicState
   */
  constructor(options: AudioWorkletNodeOptions) {
    super()

    this.inputQueue = options.processorOptions.inputQueue
    this.outputQueue = options.processorOptions.outputQueue
    this.atomicState = options.processorOptions.atomicState
    Object.setPrototypeOf(this.inputQueue, FreeQueue.prototype)
    Object.setPrototypeOf(this.outputQueue, FreeQueue.prototype)
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    // const input = inputs[0]
    const output = outputs[0]

    // Push data from input into inputQueue.
    // this.inputQueue.push(input, RENDER_QUANTUM)

    // Try to pull data out of outputQueue and store it in output.
    // const didPull =
    this.outputQueue.pull(output, RENDER_QUANTUM)
    // if (!didPull) {
    //   // console.log("failed to pull.")
    // }

    // Wake up worker to process a frame of data.
    // if (this.inputQueue.isFrameAvailable(FRAME_SIZE)) {
    if (this.outputQueue.getAvailableSamples() < FRAME_SIZE) {
      Atomics.notify(this.atomicState, 0, 1)
    }
    // }

    return true
  }
}

registerProcessor('basic-processor', BasicProcessor)