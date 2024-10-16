import { Sigui, nu } from 'sigui'
import { Deferred, rpc } from 'utils'
import { Clock } from './dsp-shared.ts'
import type { DspWorker } from './dsp-worker.ts'
import DspWorkerFactory from './dsp-worker.ts?worker'

export type DspService = ReturnType<typeof DspService>

export function DspService(ctx: AudioContext) {
  using $ = Sigui()

  const deferred = Deferred<void>()
  const ready = deferred.promise
  const worker = new DspWorkerFactory()

  const service = rpc<DspWorker>(worker, {
    async isReady() {
      deferred.resolve()
    }
  })

  class DspInfo {
    dsp = $.unwrap(() => ready.then(() => service.createDsp(ctx.sampleRate)))
    @nu get clock() {
      const { dsp } = $.of(this)
      if (dsp instanceof Error) return
      $()
      const clock = Clock(dsp.memory.buffer, dsp.clock$)
      return clock
    }
  }

  const info = $(new DspInfo)

  return { info, ready, service }
}
