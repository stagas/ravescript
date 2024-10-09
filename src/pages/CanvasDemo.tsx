import { Sigui, type Signal } from 'sigui'
import { drawText } from 'utils'
import { screen } from '~/src/screen.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { H2 } from '~/src/ui/Heading.tsx'

export function CanvasDemo({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const canvas = <Canvas width={width} height={height} /> as HTMLCanvasElement

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
  })

  const c = canvas.getContext('2d')!
  document.fonts.ready.then(() => {
    info.c = c
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
    const { pr, c } = $.of(info)
    $()
    c.scale(pr, pr)
    c.textBaseline = 'top'
    c.textRendering = 'optimizeSpeed'
    c.miterLimit = 1.5
    c.font = '32px "Fustat"'
  })

  $.fx(() => {
    const { c, width, height } = $.of(info)
    $()
    c.translate(width / 2, height / 2)
    tick()
    return () => cancelAnimationFrame(animFrame)
  })

  return <div>
    <H2>Canvas demo</H2>
    {canvas}
  </div>
}
