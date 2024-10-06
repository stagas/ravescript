import { Sigui, type Signal } from 'sigui'
import { drawText } from 'utils'
import { screen } from '~/src/screen.ts'

export function Canvas({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const canvas = <canvas width="1" height="1" /> as HTMLCanvasElement
  const c = canvas.getContext('2d')!

  const info = $({
    pr: screen.$.pr,
    width,
    height,
    c: $.unwrap(async () => {
      await document.fonts.ready
      return c
    })
  })

  $.fx(() => {
    const { c, width, height, pr } = $.of(info)
    $()
    if (c instanceof Error) return
    canvas.width = width * pr
    canvas.height = height * pr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    c.scale(pr, pr)
    c.textBaseline = 'top'
    c.textRendering = 'optimizeSpeed'
    c.miterLimit = 1.5
    c.font = '32px "Fustat"'
  })

  let i = 0
  let animFrame: any
  function tick() {
    animFrame = requestAnimationFrame(tick)
    c.restore()
    c.save()
    c.rotate(0.12 * i++)
    drawText(c, { x: 10, y: 10 }, 'Hello World', `hsl(${i % 360}, 50%, 50%)`, 4, '#000')
  }

  $.fx(() => {
    const { c } = $.of(info)
    $()
    if (c instanceof Error) return
    c.translate(info.width / 2, info.height / 2)
    tick()
    return () => cancelAnimationFrame(animFrame)
  })

  return canvas
}
