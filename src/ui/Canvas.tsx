import { Sigui, type Signal } from 'sigui'
import { screen } from '~/src/screen.ts'

export function Canvas({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const canvas = <canvas
    width="1"
    height="1"
    class="touch-none"
  /> as HTMLCanvasElement

  const info = $({
    pr: screen.$.pr,
    width,
    height,
  })

  $.fx(() => {
    const { width, height, pr } = $.of(info)
    $()
    canvas.width = width * pr
    canvas.height = height * pr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  })

  return canvas
}
