import { Sigui, type Signal } from 'sigui'
import { drawText } from 'utils'
import { Anim } from '~/src/as/gfx/anim.ts'
import type { Token } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { Buffer, Caret, Dims, Point, Widgets } from '~/src/ui/editor/index.ts'

interface TokenDrawInfo {
  point: Point
  fill: string
  stroke: string
}

export type View = ReturnType<typeof View>

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

  // draw info
  const tokenDrawInfo = new WeakMap<Token, TokenDrawInfo>()
  let caretPoint = Point()
  let extraHeights: number[] = []

  function pointFromLinecol({ line, col }: { line: number, col: number }) {
    const { charWidth, lineHeight } = dims.info

    const p = Point()
    p.x = col * charWidth

    let top = 0
    for (let y = 0; y <= line; y++) {
      let l = widgets.lines.get(y)
      if (l) top += l.deco
      if (y === line) p.y = top
      top += lineHeight
      if (l) top += l.subs
    }

    return p
  }

  // update token draw info
  $.fx(() => {
    const { tokens, linesVisual } = buffer.info
    const { charWidth, lineHeight } = dims.info

    $()

    const lastVisibleLine = linesVisual.length
    let eh = 0
    extraHeights = Array.from({ length: lastVisibleLine }, (_, y) => {
      let curr = eh
      const line = linesVisual[y]
      if (!line.text.trim().length) eh += lineHeight
      else eh = 0
      return curr
    })

    widgets.deco.forEach(w => {
      const b = w.bounds
      const p = pointFromLinecol(b)
      w.rect.x = p.x
      w.rect.y = p.y - widgets.heights.deco - extraHeights[b.line]
      w.rect.w = (b.right - b.col) * charWidth
      w.rect.h = widgets.heights.deco + extraHeights[b.line]
    })

    widgets.subs.forEach(w => {
      const b = w.bounds
      const p = pointFromLinecol(b)
      w.rect.x = p.x
      w.rect.y = p.y + lineHeight
      w.rect.w = (b.right - b.col) * charWidth
      w.rect.h = widgets.heights.subs
    })

    widgets.mark.forEach(w => {
      const b = w.bounds
      const p = pointFromLinecol(b)
      w.rect.x = p.x
      w.rect.y = p.y
      w.rect.w = (b.right - b.col) * charWidth
      w.rect.h = lineHeight
    })

    tokens.forEach(token => {
      const point = pointFromLinecol(token)
      const { fill, stroke } = colorize(token)
      tokenDrawInfo.set(token, {
        point,
        fill,
        stroke,
      })
    })
  })

  $.fx(() => {
    const { tokens } = buffer.info
    const { x, y } = caret.visual
    $()
    caretPoint = pointFromLinecol({ line: y, col: x })
  })

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
    anim.info.epoch++
  })

  function draw() {
    const { c, width, height } = $.of(info)
    const { charWidth, lineHeight } = dims.info
    const { y: cy } = caret.visual

    // clear editor
    c.clearRect(0, 0, width, height)

    c.save()
    c.translate(1, 1)

    // draw active line
    c.fillStyle = '#333'
    c.fillRect(0, caretPoint.y, width, lineHeight - 2)

    // draw text
    c.save()
    c.translate(1, 1)
    buffer.info.tokens.forEach(token => {
      const d = tokenDrawInfo.get(token)
      if (d) drawText(c, d.point, token.text, d.fill, .025, d.stroke)
    })
    c.restore()

    // draw widgets
    widgets.draw()


    // draw caret
    caret.draw(c, caretPoint)
    c.restore()
  }

  return { el, info, widgets, anim }
}
