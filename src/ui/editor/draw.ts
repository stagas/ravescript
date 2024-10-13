import { Point, Widgets, type Buffer, type Caret, type Dims, type Linecol, type Selection, type View } from 'editor'
import { Sigui } from 'sigui'
import { assign, clamp, drawText, randomHex } from 'utils'
import type { Token } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { theme } from '~/src/theme.ts'

interface TokenDrawInfo {
  point: Point
  fill: string
  stroke: string
}

export type Draw = ReturnType<typeof Draw>

export function Draw({ view, selection, caret, dims, buffer, colorize }: {
  view: View
  selection: Selection
  caret: Caret
  dims: Dims
  buffer: Buffer
  colorize: (token: Token) => { fill: string, stroke: string }
}) {
  using $ = Sigui()

  const { c } = view
  const { rect } = dims.info.$

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    rect,
    showScrollbars: false,
  })

  const widgets = Widgets({ c })

  // drawing info
  const tokenDrawInfo = new WeakMap<Token, TokenDrawInfo>()
  let caretViewPoint = $(Point())
  let extraHeights: number[] = []
  let innerSize = Point()
  const textPadding = 5
  const scrollbarSize = 5

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
      if (l?.subs) top += l.subs + 2
    }

    p.x = Math.floor(p.x + textPadding)
    p.y = Math.floor(p.y + textPadding)

    return p
  }

  function linecolFromViewPoint({ x, y }: Point): Linecol {
    const { charWidth, lineHeight } = dims.info
    const { linesVisual } = buffer.info

    y -= textPadding
    x -= textPadding

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
          if (l.subs) top += l.subs + 2
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
    // NOTE: bugfix while toggling block comments caret wasn't updated.
    //  there must be a real solution to this but for now this works.
    assign(caretViewPoint, viewPointFromLinecol({ line: y, col: x }))
    queueMicrotask(() => {
      assign(caretViewPoint, viewPointFromLinecol({ line: y, col: x }))
    })
  })

  // wait for fonts to load
  document.fonts.ready.then(() => {
    info.c = c

    // measure char width and height
    const metrics = c.measureText('M')
    dims.info.charWidth = metrics.width
    dims.info.charHeight = Math.ceil(metrics.fontBoundingBoxDescent - metrics.fontBoundingBoxAscent)
  })

  // update inner size
  $.fx(() => {
    const { w, h } = info.rect
    const { linesVisual } = buffer.info
    const { lineHeight } = dims.info
    $()
    innerSize.x = 0
    innerSize.y = 0
    for (const line of linesVisual) {
      innerSize.x = Math.max(innerSize.x, line.text.length * dims.info.charWidth + textPadding * 2)
    }
    innerSize.x = Math.max(w, innerSize.x)
    innerSize.y = Math.max(h, viewPointFromLinecol({ line: linesVisual.length, col: 0 }).y + textPadding * 2)
  })

  // update scroll
  $.fx(() => {
    const { rect: { w, h }, scrollX, scrollY } = dims.info
    const { x, y } = innerSize
    $()
    dims.info.scrollX = clamp(-(x - w), 0, scrollX)
    dims.info.scrollY = clamp(-(y - h), 0, scrollY)
  })

  // keep caret in view by adjusting scroll when caret is moving
  $.fx(() => {
    const { x, y } = caretViewPoint
    const { w, h } = info.rect
    const { charWidth, charHeight } = dims.info
    $()
    const { scrollX, scrollY } = dims.info

    if (y > -scrollY + h - charHeight) dims.info.scrollY = -(y - h + charHeight)
    if (y < -scrollY) dims.info.scrollY = -y

    if (x > -scrollX + w - charWidth) dims.info.scrollX = -(x - w + charWidth)
    if (x < -scrollX) dims.info.scrollX = -x
  })

  // update page size
  $.fx(() => {
    const { w, h } = info.rect
    const { charWidth, lineHeight } = dims.info
    $()
    dims.info.pageWidth = Math.floor((w - textPadding * 2) / charWidth)
    dims.info.pageHeight = Math.floor((h - textPadding * 2) / lineHeight)
  })

  // trigger draw
  $.fx(() => {
    const { c, pr, rect: { x, y, w, h }, showScrollbars } = $.of(info)
    const { code } = buffer.info
    const { caretWidth, charWidth, charHeight, lineHeight, scrollX, scrollY } = dims.info
    const { isVisible: isCaretVisible } = caret.info
    const { x: cx, y: cy } = caret.visual
    const { start: { line: sl, col: sc }, end: { line: el, col: ec } } = selection.info
    $()
    view.anim.info.epoch++
  })

  const color = randomHex(3, '2', '5')
  function drawClear() {
    const { x, y, w, h } = info.rect
    c.beginPath()
    c.rect(x, y, w, h)
    c.clip()
    c.clearRect(x, y, w + 1, h + 1)
    // temp
    c.translate(x, y)
    c.fillStyle = '#' + color
    c.fillRect(0, 0, w, h)

    c.translate(dims.info.scrollX, dims.info.scrollY)

  }

  function drawActiveLine() {
    c.fillStyle = '#fff1'
    c.fillRect(0, caretViewPoint.y, info.rect.w, dims.info.lineHeight - 2)
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

  function drawScrollbars() {
    if (!info.showScrollbars) return

    // outer rectangle
    const { x, y, w, h } = info.rect

    // scroll amount
    const { scrollX, scrollY } = dims.info

    // inner size
    const { x: bx, y: by } = innerSize

    c.fillStyle = '#aaa5'

    // draw vertical scrollbar
    {
      const coeff = h / by
      if (coeff < 1) {
        const scrollbarWidth = scrollbarSize
        const scrollbarHeight = h * (h / by)
        const scrollbarY = (-scrollY / by) * h

        c.fillRect(
          x + w - scrollbarWidth,
          y + scrollbarY,
          scrollbarWidth,
          scrollbarHeight
        )
      }
    }

    // draw horizontal scrollbar
    {
      const coeff = w / bx
      if (coeff < 1) {
        const scrollbarWidth = w * coeff
        const scrollbarHeight = scrollbarSize
        const scrollbarX = (-scrollX / bx) * w
        c.fillRect(
          x + scrollbarX,
          y + h - scrollbarHeight,
          scrollbarWidth,
          scrollbarHeight
        )
      }
    }
  }

  function draw() {
    c.save()
    drawClear()
    drawActiveLine()
    drawSelection()
    drawCode()
    widgets.draw()
    drawCaret()
    c.restore()
    drawScrollbars()
  }

  return {
    info,
    draw,
    widgets,
    linecolFromViewPoint
  }
}
