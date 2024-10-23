import { Sigui } from 'sigui'
import { Player } from '~/src/as/pkg/player.ts'
import { PkgService } from '~/src/as/pkg/service.ts'
import pkg from '~/src/as/pkg/wasm.ts'
import { Button, Input } from '~/src/ui/index.ts'

let audioContext: AudioContext

export function AssemblyScript() {
  using $ = Sigui()

  const info = $({
    fromWorker: null as null | number,
    n1: 2,
    n2: 3,
  })

  audioContext ??= new AudioContext()

  const pkgPlayer = Player(audioContext)
  $.fx(() => () => pkgPlayer.destroy())

  const pkgService = PkgService()
  $.fx(() => () => pkgService.terminate())

  $.fx(() => {
    const { n1, n2 } = info
    const { pkg } = $.of(pkgService.info)
    $().then(async () => {
      info.fromWorker = await pkgService.service.multiply(n1, n2)
    })
  })

  return <div>
    Welcome from AssemblyScript!
    <br />
    Direct: {pkg.multiply(2, 3)}
    <br />
    <div class="flex flex-row gap-1 items-center">
      Worker: <Input
        onchange={ev => {
          info.n1 = +(ev.target as HTMLInputElement).value
        }}
        class="w-8"
        value={() => info.n1}
      /> + <Input
        onchange={ev => {
          info.n2 = +(ev.target as HTMLInputElement).value
        }}
        class="w-8"
        value={() => info.n2}
      /> = {() => info.fromWorker}
    </div>
    <br />
    Worklet: <Button onpointerdown={() => pkgPlayer.play()}>Play</Button>
    <Button onpointerdown={() => pkgPlayer.stop()}>Stop</Button>
  </div>
}
