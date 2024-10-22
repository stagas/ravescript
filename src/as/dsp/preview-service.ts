import { Sigui } from 'sigui'
import { Deferred, getMemoryView, rpc, type MemoryView } from 'utils'
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
    view: null as null | MemoryView
  })

  isReady.then(() => {
    info.isReady = true
  })

  $.fx(() => {
    const { isReady } = $.of(info)
    $().then(async () => {
      const dsp = await service.createDsp(ctx.sampleRate)
      const view = getMemoryView(dsp.memory)
      $.batch(() => {
        info.dsp = dsp
        info.view = view
      })
    })
  })

  function dispose() {
    worker.terminate()
  }

  return { info, isReady, service, dispose }
}
