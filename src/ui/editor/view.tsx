import { Point, Widgets, type Buffer, type Caret, type Dims, type Linecol, type Selection } from 'editor'
import { Sigui, type Signal } from 'sigui'
import { clamp, drawText } from 'utils'
import { Anim } from '~/src/as/gfx/anim.ts'
import type { Token } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { theme } from '~/src/theme.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'

interface TokenDrawInfo {
  point: Point
  fill: string
  stroke: string
}

export type View = ReturnType<typeof View>

export function View({ selection, caret, dims, buffer, colorize }: {
  selection: Selection
  caret: Caret
  dims: Dims
  buffer: Buffer
  colorize: (token: Token) => { fill: string, stroke: string }
}) {
  using $ = Sigui()

  const { width, height } = dims.info.$

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
    svgs: new Set<SVGElement>()
  })

  const canvas = <Canvas width={width} height={height} class="absolute top-0 left-0" /> as HTMLCanvasElement
  const glCanvas = <Canvas width={width} height={height} class="absolute top-0 left-0" /> as HTMLCanvasElement
  const svg = <svg width={width} height={height} class="absolute top-0 left-0" >{() =>
    [...info.svgs]
  }</svg> as SVGSVGElement

  const el = <div class="relative cursor-text">
    {canvas}
    {glCanvas}
    {svg}
  </div> as HTMLDivElement

  const c = canvas.getContext('2d')!
  const widgets = Widgets({ width, height, c, glCanvas })
  const anim = Anim()
  anim.ticks.add(draw)

  // drawing info
  const tokenDrawInfo = new WeakMap<Token, TokenDrawInfo>()
  let caretViewPoint = Point()
  let extraHeights: number[] = []

  function viewPointFromLinecol({ line, col }: Linecol): Point {
    const { charWidth, lineHeight } = dims.info

    const p = Point()
    p.x = col * charWidth

    let top = 0
    for (let y = 0; y <= line; y++) {
      let l = widgets.lines.get(y)
      if (l) top += l.deco
      if (y === line) p.y = top
      top += lineHeight
      if (l) top += l.subs + 2
    }

    p.x = Math.floor(p.x + 1)
    p.y = Math.floor(p.y + 1)

    return p
  }

  function linecolFromViewPoint({ x, y }: Point): Linecol {
    const { charWidth, lineHeight } = dims.info
    const { linesVisual } = buffer.info

    let top = 0
    out: {
      for (let i = 0; i <= linesVisual.length; i++) {
        if (y < top) {
          y = i - 1
          break out
        }

        let l = widgets.lines.get(i)
        if (l) {
          top += l.deco
          top += l.subs + 2
        }
        top += lineHeight
      }
      y = linesVisual.length - 1
    }

    const line = clamp(0, linesVisual.length - 1, y)
    const col = clamp(0, linesVisual[y]?.text.length ?? 0, Math.round((x - 3) / charWidth))

    return { line, col }
  }

  // update token draw info
  $.fx(() => {
    const { tokens, linesVisual } = buffer.info
    const { charWidth, lineHeight } = dims.info

    $()

    widgets.update()

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
      const p = viewPointFromLinecol(b)
      w.rect.x = p.x
      w.rect.y = p.y - widgets.heights.deco - extraHeights[b.line]
      w.rect.w = ((b.right - b.col) * charWidth) | 0
      w.rect.h = widgets.heights.deco + extraHeights[b.line] - .5
    })

    widgets.subs.forEach(w => {
      const b = w.bounds
      const p = viewPointFromLinecol(b)
      w.rect.x = p.x
      w.rect.y = p.y + lineHeight - 1
      w.rect.w = ((b.right - b.col) * charWidth) | 0
      w.rect.h = widgets.heights.subs
    })

    widgets.mark.forEach(w => {
      const b = w.bounds
      const p = viewPointFromLinecol(b)
      w.rect.x = p.x - 1
      w.rect.y = p.y - 1
      w.rect.w = (((b.right - b.col) * charWidth) | 0) + 2.75
      w.rect.h = (lineHeight) - .5
    })

    tokens.forEach(token => {
      const point = viewPointFromLinecol(token)
      point.y += 1
      const { fill, stroke } = colorize(token)
      tokenDrawInfo.set(token, {
        point,
        fill,
        stroke,
      })
    })
  })

  // update caret view point
  $.fx(() => {
    const { tokens } = buffer.info
    const { x, y } = caret.visual
    $()
    caretViewPoint = viewPointFromLinecol({ line: y, col: x })
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
    c.imageSmoothingEnabled = false
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
    buffer.info.maxColumns = Math.floor(width / charWidth)
  })

  // trigger draw
  $.fx(() => {
    const { c, pr, width, height } = $.of(info)
    const { code } = buffer.info
    const { caretWidth, charWidth, charHeight, lineHeight } = dims.info
    const { isVisible: isCaretVisible } = caret.info
    const { x: cx, y: cy } = caret.info.visual
    const { start: { line: sl, col: sc }, end: { line: el, col: ec } } = selection.info
    $()
    anim.info.epoch++
  })

  function drawClear() {
    c.clearRect(0, 0, info.width, info.height)
  }

  function drawActiveLine() {
    c.fillStyle = '#333'
    c.fillRect(0, caretViewPoint.y, info.width, dims.info.lineHeight - 2)
  }

  function drawSelection() {
    if (!selection.isActive) return
    const { lineHeight } = dims.info
    const { start, end } = selection.sorted
    const brPadding = 5
    c.fillStyle = theme.colors.blue[800]
    for (let line = start.line; line <= end.line; line++) {
      const c1 = line === start.line ? start.col : 0
      const c2 = line === end.line ? end.col : buffer.linesVisual[line].text.length
      const p1 = viewPointFromLinecol({ line, col: c1 })
      const p2 = viewPointFromLinecol({ line, col: c2 })
      c.fillRect(p1.x, p1.y, p2.x - p1.x + (line === end.line ? 0 : brPadding), lineHeight)
    }
  }

  function drawCode() {
    buffer.info.tokens.forEach(token => {
      const d = tokenDrawInfo.get(token)
      if (d) drawText(c, d.point, token.text, d.fill, .025, d.stroke)
    })
  }

  function drawCaret() {
    if (!caret.info.isVisible) return
    const { caretWidth, charHeight } = dims.info
    c.fillStyle = '#fff'
    c.fillRect(
      caretViewPoint.x,
      caretViewPoint.y + .5,
      caretWidth,
      charHeight
    )
  }

  function draw() {
    drawClear()
    drawActiveLine()
    drawSelection()
    drawCode()
    widgets.draw()
    drawCaret()
  }

  return {
    el,
    info,
    widgets,
    anim,
    linecolFromViewPoint
  }
}
