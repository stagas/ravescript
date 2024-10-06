import { Sigui } from 'sigui'
import { Deferred, rpc } from 'utils'
import type { PkgWorker } from '~/src/as/pkg/worker.ts'
import PkgWorkerFactory from '~/src/as/pkg/worker.ts?worker'

export type PkgService = ReturnType<typeof PkgService>

export function PkgService() {
  using $ = Sigui()

  const deferred = Deferred<void>()
  const ready = deferred.promise
  const worker = new PkgWorkerFactory()

  const service = rpc<PkgWorker>(worker, {
    async isReady() {
      deferred.resolve()
    }
  })

  const info = $({
    pkg: $.unwrap(() => ready.then(() => service.create()))
  })

  function terminate() {
    worker.terminate()
    console.log('[pkg-worker] terminated')
  }

  return { info, ready, service, worker, terminate }
}
