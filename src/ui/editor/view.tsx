import { Sigui, type Signal } from 'sigui'
import { drawText } from 'utils'
import { Anim } from '~/src/as/gfx/anim.ts'
import type { Token } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { Point, Widgets } from '~/src/ui/Editor.tsx'
import { Buffer } from '~/src/ui/editor/buffer.ts'
import { Caret } from '~/src/ui/editor/caret.ts'
import { Dims } from '~/src/ui/editor/dims.ts'

export function View({ width, height, dims, caret, buffer, colorize }: {
  width: Signal<number>
  height: Signal<number>
  dims: Dims
  caret: Caret
  buffer: Buffer
  colorize: (token: Token) => { fill: string, stroke: string }
}) {
  using $ = Sigui()

  const canvas = <Canvas width={width} height={height} class="absolute top-0 left-0" /> as HTMLCanvasElement
  const glCanvas = <Canvas width={width} height={height} class="absolute top-0 left-0" /> as HTMLCanvasElement
  const el = <div class="relative">{canvas}{glCanvas}</div> as HTMLDivElement

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
  })

  const c = canvas.getContext('2d')!

  const widgets = Widgets({ width, height, c, glCanvas })

  const anim = Anim()
  anim.ticks.add(draw)

  // wait for fonts to load
  document.fonts.ready.then(() => {
    info.c = c

    // measure char width and height
    const metrics = c.measureText('M')
    dims.info.charWidth = metrics.width
    dims.info.charHeight = Math.ceil(metrics.fontBoundingBoxDescent - metrics.fontBoundingBoxAscent)
  })

  const p: Point = Point()

  function pointFromLinecol({ line, col }: { line: number, col: number }, charWidth: number, lineHeight: number) {
    p.x = 1 + col * charWidth
    p.y = 1 + line * lineHeight
    return p
  }

  function draw() {
    const { c, width, height } = $.of(info)
    const { charWidth, lineHeight } = dims.info
    const { y: cy } = caret.info.visual

    // draw widgets
    widgets.draw()

    // clear editor
    c.clearRect(0, 0, width, height)

    // highlight line
    c.fillStyle = '#333'
    c.fillRect(0, Math.floor(cy * lineHeight), width, lineHeight - 2)

    // draw text
    buffer.info.tokens.forEach(token => {
      const p = pointFromLinecol(token, charWidth, lineHeight)
      const { fill, stroke } = colorize(token)
      drawText(c, p, token.text, fill, .025, stroke)
    })

    // draw caret
    caret.draw(c)
  }

  // initialize canvas context settings
  $.fx(() => {
    const { c, pr, width, height } = $.of(info)
    $()
    c.scale(pr, pr)
    c.textBaseline = 'top'
    c.textRendering = 'optimizeLegibility'
    c.miterLimit = 1.5
    c.font = '16px "IBM Plex Mono", monospace'
  })

  // adjust text columns width based on view width
  $.fx(() => {
    const { width } = info
    const { charWidth } = dims.info
    $()
    buffer.info.maxColumns = width / charWidth
  })

  // draw everything
  $.fx(() => {
    const { c, pr, width, height } = $.of(info)
    const { code } = buffer.info
    const { caretWidth, charWidth, charHeight, lineHeight } = dims.info
    const { isVisible: isCaretVisible } = caret.info
    const { x: cx, y: cy } = caret.info.visual
    $()
    anim.info.epoch++
  })

  return { el, info, widgets, anim }
}
