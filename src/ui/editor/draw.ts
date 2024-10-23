import { Point, pointToLinecol, Widgets, type Buffer, type Caret, type Dims, type Linecol, type PaneInfo, type Selection, type View, type Widget } from 'editor'
import { Matrix, Rect } from 'gfx'
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

export function Draw({ paneInfo, view, selection, caret, dims, buffer, colorize }: {
  paneInfo: PaneInfo
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

    shouldRedraw: false,

    triggerUpdateTokenDrawInfo: 0,

    // scrollbars
    showScrollbars: false,
    scrollbarColor: '#aaa',
    scrollbarY: $({
      get coeff() {
        return info.rect.h / dims.info.innerSize.y
      },
      get isVisible() {
        return this.coeff < 1
      },
      get size() {
        return dims.info.scrollbarViewSize * ((paneInfo.isHoveringScrollbarY || paneInfo.isDraggingScrollbarY) ? 2 : 1)
      },
      get length() {
        return info.rect.h * this.coeff
      },
      get offset() {
        return info.rect.y + (-dims.info.scrollY / dims.info.innerSize.y) * info.rect.h
      },
      get pos() {
        return info.rect.x + info.rect.w - this.size
      },
      get color() {
        return info.scrollbarColor + (
          paneInfo.isDraggingScrollbarY ? 'f'
            : paneInfo.isHoveringScrollbarY ? '7'
              : '5'
        )
      }
    }),
    scrollbarX: $({
      get coeff() {
        return info.rect.w / dims.info.innerSize.x
      },
      get isVisible() {
        return this.coeff < 1
      },
      get size() {
        return dims.info.scrollbarViewSize * ((paneInfo.isHoveringScrollbarX || paneInfo.isDraggingScrollbarX) ? 2 : 1)
      },
      get length() {
        return info.rect.w * this.coeff
      },
      get offset() {
        return info.rect.x + (-dims.info.scrollX / dims.info.innerSize.x) * info.rect.w
      },
      get pos() {
        return info.rect.y + info.rect.h - this.size
      },
      get color() {
        return info.scrollbarColor + (
          paneInfo.isDraggingScrollbarX ? 'f'
            : paneInfo.isHoveringScrollbarX ? '7'
              : '5'
        )
      }
    })
  })

  const widgets = Widgets({ c })
  const webglView = Rect(info.rect.$.x, info.rect.$.y, info.rect.$.w, info.rect.$.h)
  const webglMatrix = Matrix()
  const webgl = view.gfx.createContext(webglView, webglMatrix)
  const webglShapes = webgl.createShapes()
  webgl.sketch.scene.add(webglShapes)
  view.anim.ticks.add(webgl.meshes.draw)
  $.fx(() => {
    const { scrollX, scrollY } = dims.info
    $()
    webglMatrix.e = scrollX
    webglMatrix.f = scrollY
  })

  // drawing info
  const tokenDrawInfo = new WeakMap<Token, TokenDrawInfo>()
  let caretViewPoint = $(Point())
  let extraHeights: number[] = []
  const textPadding = 5

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

  function linecolFromViewPoint({ x, y }: Point): Linecol & { hoverLine: boolean } {
    const { charWidth, lineHeight } = dims.info
    const { linesVisual } = buffer.info

    y -= textPadding
    x -= textPadding

    let top = 0
    let ty = 0
    let hoverLine = false
    out: {
      for (let i = 0; i <= linesVisual.length; i++) {
        if (y < top) {
          ty = i - 1
          break out
        }

        let l = widgets.lines.get(i)
        if (l) top += l.deco
        hoverLine = y > top
        top += lineHeight
        if (l?.subs) top += l.subs + 2
      }
      ty = linesVisual.length - 1
      hoverLine = false
    }

    const line = clamp(0, linesVisual.length - 1, ty)
    const col = clamp(0, linesVisual[ty]?.text.length ?? 0, Math.round((x - 3) / charWidth))

    return { line, col, hoverLine }
  }

  function updateMarkRect(w: Widget) {
    const { charWidth, lineHeight } = dims.info
    const b = w.bounds
    const p = viewPointFromLinecol(b)
    w.rect.x = p.x - 1
    w.rect.y = p.y - 1
    w.rect.w = (((b.right - b.col) * charWidth) | 0) + 2.75
    w.rect.h = (lineHeight) - .5
  }

  // update token draw info
  $.fx(() => {
    const { triggerUpdateTokenDrawInfo } = info
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

    widgets.mark.forEach(updateMarkRect)

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

    info.shouldRedraw = true
  })

  // update caret view point
  $.fx(() => {
    const { triggerUpdateTokenDrawInfo } = info
    const { tokens } = buffer.info
    const { x, y } = caret.visual
    $()
    assign(caretViewPoint, viewPointFromLinecol(pointToLinecol(caret.visual)))
  })

  // wait for fonts to load
  document.fonts.ready.then($.fn(() => {
    info.c = c

    // measure char width and height
    const metrics = c.measureText('M')
    dims.info.charWidth = metrics.width
    dims.info.charHeight = Math.ceil(metrics.fontBoundingBoxDescent - metrics.fontBoundingBoxAscent)
  }))

  // update inner size
  $.fx(() => {
    const { triggerUpdateTokenDrawInfo } = info
    const { w, h } = info.rect
    const { linesVisual } = buffer.info
    const { charWidth, lineHeight, innerSize } = dims.info
    $()

    let x = 0

    for (const line of linesVisual) {
      x = Math.max(
        x,
        line.text.length * charWidth +
        textPadding * 2
      )
    }

    innerSize.x = Math.max(
      w,
      x +
      (info.scrollbarY.isVisible ? info.scrollbarY.size * 3 : 0)
    )

    innerSize.y = Math.max(
      h,
      viewPointFromLinecol({
        line: linesVisual.length, col: 0
      }).y +
      textPadding * 2 +
      (info.scrollbarX.isVisible ? info.scrollbarX.size * 2 : 0)
    )
  })

  // update scroll
  $.fx(() => {
    const { rect: { w, h }, scrollX, scrollY, innerSize } = dims.info
    const { x, y } = innerSize
    $()
    dims.info.scrollX = clamp(-(x - w), 0, scrollX)
    dims.info.scrollY = clamp(-(y - h), 0, scrollY)
  })

  // update show scrollbars when hovering pane
  $.fx(() => {
    const { isHovering } = paneInfo
    $()
    if (isHovering) {
      info.showScrollbars = true
      return () => info.showScrollbars = false
    }
  })

  // keep caret in view by adjusting scroll when caret is moving
  $.fx(() => {
    const { x, y } = caretViewPoint
    const { w, h } = info.rect
    const { charWidth, charHeight, lineHeight } = dims.info
    $()
    const { scrollX, scrollY } = dims.info

    const padY = lineHeight + 1

    if (y > -scrollY + h - charHeight - padY) dims.info.scrollY = -(y - h + charHeight + padY)
    if (y < -scrollY + padY) dims.info.scrollY = -y + padY

    if (x > -scrollX + w - charWidth) dims.info.scrollX = -(x - w + charWidth)
    if (x < -scrollX) dims.info.scrollX = -x
  })

  // update page size
  $.fx(() => {
    const { w, h } = info.rect
    const { charWidth, lineHeight } = dims.info
    $()
    dims.info.pageWidth = Math.floor((w - textPadding * 2 - charWidth * 1.5) / charWidth)
    dims.info.pageHeight = Math.floor((h - textPadding * 2) / lineHeight)
  })

  // trigger draw
  $.fx(() => {
    const { width, height } = view.info
    const { c, pr, rect: { x, y, w, h }, showScrollbars } = $.of(info)
    const {
      isHovering,
      isHoveringScrollbarX, isDraggingScrollbarX,
      isHoveringScrollbarY, isDraggingScrollbarY,
    } = paneInfo
    const { code } = buffer.info
    const { caretWidth, charWidth, charHeight, lineHeight, scrollX, scrollY } = dims.info
    const { isVisible: isCaretVisible } = caret.info
    const { x: cx, y: cy } = caret.visual
    const { start: { line: sl, col: sc }, end: { line: el, col: ec } } = selection.info
    $()
    info.shouldRedraw = true
    view.anim.info.epoch++
  })

  const color = randomHex(3, '2', '5')

  function drawClear() {
    const { x, y, w, h } = info.rect
    c.beginPath()
    c.rect(x, y, w, h)
    c.clip()
    c.clearRect(x, y, w + 1, h + 1)

    // TODO: temp remove this
    // c.translate(x, y)
    // c.fillStyle = '#' + color
    // c.fillRect(0, 0, w, h)

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
    const { caretWidth: w, charHeight: h } = dims.info
    const { x, y } = caretViewPoint
    c.fillStyle = '#fff'
    c.fillRect(x, y + .5, w, h)
  }

  function drawScrollbars() {
    if (!info.showScrollbars) return

    const { scrollbarX, scrollbarY } = info

    // draw vertical scrollbar
    if (scrollbarY.isVisible) {
      c.fillStyle = info.scrollbarY.color
      const { pos: x, offset: y, size: w, length: h } = scrollbarY
      c.fillRect(x, y, w, h)
    }

    // draw horizontal scrollbar
    if (scrollbarX.isVisible) {
      c.fillStyle = info.scrollbarX.color
      const { offset: x, pos: y, length: w, size: h } = scrollbarX
      c.fillRect(x, y, w, h)
    }
  }

  function draw() {
    c.save()
    if (info.shouldRedraw) {
      drawClear()
      drawActiveLine()
      drawSelection()
      widgets.drawDecoMark()
      drawCode()
      widgets.drawSubs()
      drawCaret()
      c.restore()
      drawScrollbars()
      info.shouldRedraw = false
    }
    else {
      widgets.drawDecoMark()
    }
  }

  return {
    info,
    draw,
    webgl,
    shapes: webglShapes,
    widgets,
    linecolFromViewPoint,
    viewPointFromLinecol,
    updateMarkRect,
  }
}
