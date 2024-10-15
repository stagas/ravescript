import { Linecol, Point, type Caret, type Dims, type Draw, type PaneInfo, type Selection } from 'editor'
import { Sigui } from 'sigui'
import { assign, MouseButtons } from 'utils'

const CLICK_TIMEOUT = 350

export function Mouse({ paneInfo, dims, selection, caret, draw }: {
  paneInfo: PaneInfo
  dims: Dims
  selection: Selection
  caret: Caret
  draw: Draw
}) {
  using $ = Sigui()

  const info = $({
    isDown: false,
    buttons: 0,
    clickTimeout: -1 as any,
    count: 0,
    x: 0,
    y: 0,
    actual: $(Point()),
    linecol: $(Linecol()),
    wheel: $(Point()),
    ctrl: false,
  })

  $.fx(() => {
    const { x, y } = info
    $()
    assign(info.linecol, draw.linecolFromViewPoint(info))
  })

  // blink caret
  $.fx(() => {
    const { isDown } = info
    const { isFocus } = paneInfo
    const { isBlink, blinkReset } = caret.info
    $()
    if (!isFocus || !isBlink) {
      if (!isDown) {
        caret.info.isVisible = false
        selection.reset()
      }
      return
    }
    caret.info.isVisible = true
    const caretIv = setInterval(() => {
      caret.info.isVisible = !caret.info.isVisible
    }, 500)
    return () => {
      caret.info.isVisible = true
      clearInterval(caretIv)
    }
  })

  let scrollbarPointStart = 0
  let scrollbarScrollStart = 0

  $.fx(() => {
    const { isDown, actual: { x, y } } = info
    if (isDown) return
    $()
    if (x >= dims.info.rect.w - dims.info.scrollbarHandleSize &&
      !paneInfo.isDraggingScrollbarX &&
      draw.info.scrollbarY.isVisible
    ) {
      paneInfo.isHoveringScrollbarY = true
    }
    else if (!paneInfo.isDraggingScrollbarY) {
      paneInfo.isHoveringScrollbarY = false
    }

    if (y >= dims.info.rect.h - dims.info.scrollbarHandleSize &&
      !paneInfo.isDraggingScrollbarY &&
      draw.info.scrollbarX.isVisible
    ) {
      paneInfo.isHoveringScrollbarX = true
    }
    else if (!paneInfo.isDraggingScrollbarX) {
      paneInfo.isHoveringScrollbarX = false
    }
  })

  function handleWheel() {
    $.flush()

    if (mouse.onWheel()) return

    const { x, y } = info.wheel

    if (Math.abs(y) > Math.abs(x)) {
      dims.info.scrollY -= y * .35
    }
    else {
      dims.info.scrollX -= x * .35
    }
  }

  function handleDown() {
    $.flush()

    info.isDown = true

    if (info.buttons & MouseButtons.Left) {
      // handle scrollbarY down
      if (paneInfo.isHoveringScrollbarY) {
        paneInfo.isDraggingScrollbarY = true
        scrollbarPointStart = info.actual.y
        scrollbarScrollStart = dims.info.scrollY
        return
      }

      // handle scrollbarX down
      if (paneInfo.isHoveringScrollbarX) {
        paneInfo.isDraggingScrollbarX = true
        scrollbarPointStart = info.actual.x
        scrollbarScrollStart = dims.info.scrollX
        return
      }
    }

    if (mouse.onDown()) return

    paneInfo.isFocus = true

    if (info.buttons & MouseButtons.Middle) {
      // TODO: implement middle click
      return
    }

    if (info.buttons & MouseButtons.Right) {
      // TODO: implement right click
      return
    }

    clearTimeout(info.clickTimeout)

    info.clickTimeout = setTimeout(() => info.count = 0, CLICK_TIMEOUT)

    info.count++

    switch (info.count) {
      case 1: {
        selection.reset()
        Object.assign(caret, info.linecol)
        caret.visualXIntent = caret.col
        $.flush()
        selection.reset()
        break
      }
      case 2: selection.selectWord(); break
      case 3: selection.selectBlock(); break
      case 4: selection.selectLine(); break
      default: {
        selection.reset()
        info.count = 0
        break
      }
    }
    caret.info.isBlink = false
  }

  function handleUp() {
    $.flush()

    info.isDown = false
    paneInfo.isDraggingScrollbarX = false
    paneInfo.isDraggingScrollbarY = false

    if (mouse.onUp()) return

    info.buttons = 0
    caret.info.isBlink = true
  }

  function handleMove() {
    $.flush()

    if (paneInfo.isDraggingScrollbarY) {
      const { h: outerHeight } = dims.info.rect
      const { y: innerHeight } = dims.info.innerSize
      const coeff = outerHeight / innerHeight
      dims.info.scrollY = scrollbarScrollStart - ((info.actual.y - scrollbarPointStart) / coeff)
      return
    }

    if (paneInfo.isDraggingScrollbarX) {
      const { w: outerWidth } = dims.info.rect
      const { x: innerWidth } = dims.info.innerSize
      const coeff = outerWidth / innerWidth
      dims.info.scrollX = scrollbarScrollStart - ((info.actual.x - scrollbarPointStart) / coeff)
      return
    }

    if (mouse.onMove()) return

    if (info.buttons & MouseButtons.Left) {
      Object.assign(caret, info.linecol)
      $.flush()
      selection.toCaret()
    }
  }

  // allow mouse down override by the consumer
  function onWheel(): boolean | void { }
  function onDown(): boolean | void { }
  function onUp(): boolean | void { }
  function onMove(): boolean | void { }

  const mouse = {
    info,
    handleWheel,
    handleDown,
    handleUp,
    handleMove,
    onWheel,
    onDown,
    onUp,
    onMove,
  }

  return mouse
}
