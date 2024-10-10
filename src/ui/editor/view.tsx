import { Sigui, type Signal } from 'sigui'
import { drawText } from 'utils'
import type { Token } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'
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

  const canvas = <Canvas width={width} height={height} /> as HTMLCanvasElement

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
  })

  const c = canvas.getContext('2d')!

  // wait for fonts to load
  document.fonts.ready.then(() => {
    info.c = c

    // measure char width and height
    const metrics = c.measureText('M')
    dims.info.charWidth = metrics.width
    dims.info.charHeight = Math.ceil(metrics.fontBoundingBoxDescent - metrics.fontBoundingBoxAscent)
  })

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

    // clear editor
    c.clearRect(0, 0, width, height)

    // highlight line
    c.fillStyle = '#333'
    c.fillRect(0, Math.floor(cy * lineHeight), width, lineHeight - 2)

    // draw text
    buffer.info.tokens.forEach(token => {
      const p = {
        x: 1 + token.col * charWidth,
        y: 1 + token.line * lineHeight
      }
      const { fill, stroke } = colorize(token)
      drawText(c, p,
        token.text, fill,
        .025, stroke
      )
    })

    // draw caret
    caret.draw(c)
  })

  return { el: canvas, info }
}
