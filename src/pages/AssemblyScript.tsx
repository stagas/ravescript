import { Sigui } from 'sigui'
import { Player } from '~/src/as/pkg/player.ts'
import { PkgService } from '~/src/as/pkg/service.ts'
import pkg from '~/src/as/pkg/wasm.ts'
import { Button } from '~/src/ui/index.ts'

let audioContext: AudioContext

export function AssemblyScript() {
  using $ = Sigui()

  const info = $({
    fromWorker: null as null | number
  })

  audioContext ??= new AudioContext()

  const pkgPlayer = Player(audioContext)
  $.fx(() => () => pkgPlayer.destroy())

  const pkgService = PkgService()
  $.fx(() => () => pkgService.terminate())

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
    <Button onpointerdown={() => pkgPlayer.play()}>Play</Button>
    <Button onpointerdown={() => pkgPlayer.stop()}>Stop</Button>
  </div>
}
