import { Sigui } from 'sigui'
import { Player } from '~/src/as/pkg/player.ts'
import { PkgService } from '~/src/as/pkg/service.ts'
import pkg from '~/src/as/pkg/wasm.ts'

export function AssemblyScript() {
  using $ = Sigui()

  const pkgService = PkgService()
  $.fx(() => () => pkgService.terminate())

  const audioContext = new AudioContext()
  const pkgPlayer = Player(audioContext)

  const info = $({
    fromWorker: null as null | number
  })

  $.fx(() => {
    const { pkg } = $.of(pkgService.info)
    $()
    pkgService.service.multiply(2, 3)
      .then(result => info.fromWorker = result)
  })

  return <div>
    Welcome from AssemblyScript!
    <br />
    Direct: {pkg.multiply(2, 3)}
    <br />
    Worker: {() => info.fromWorker}
    <br />
    <button onclick={() => pkgPlayer.play()}>Play</button>
    <button onclick={() => pkgPlayer.stop()}>Stop</button>
  </div>
}
