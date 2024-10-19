import { Sigui } from 'sigui'
import { Deferred, rpc } from 'utils'
import type { PreviewWorker } from './preview-worker.ts'
import PreviewWorkerFactory from './preview-worker.ts?worker'

export type PreviewService = ReturnType<typeof PreviewService>

export function PreviewService(ctx: AudioContext) {
  using $ = Sigui()

  const deferred = Deferred<void>()
  const isReady = deferred.promise
  const worker = new PreviewWorkerFactory()
  const service = rpc<PreviewWorker>(worker, {
    async isReady() {
      deferred.resolve()
    }
  })

  const info = $({
    isReady: null as null | true,
    dsp: null as null | Awaited<ReturnType<typeof service.createDsp>>,
  })

  isReady.then(() => {
    info.isReady = true
  })

  $.fx(() => {
    const { isReady } = $.of(info)
    $().then(async () => {
      await service.createDsp(ctx.sampleRate)
    })
  })

  function dispose() {
    worker.terminate()
  }

  return { info, isReady, service, dispose }
}
