import { Linecol, type Caret, type Draw, type InputMouse, type PaneInfo, type Selection } from 'editor'
import { Sigui } from 'sigui'
import { assign, MouseButtons } from 'utils'

const CLICK_TIMEOUT = 350

export function Mouse({ paneInfo, selection, caret, draw }: {
  paneInfo: PaneInfo
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
    linecol: $(Linecol()),
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

  function handleDown() {
    $.flush()
    info.isDown = true
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
    if (mouse.onUp()) return

    info.buttons = 0
    caret.info.isBlink = true
  }

  function handleMove() {
    $.flush()
    if (mouse.onMove()) return

    if (info.buttons & MouseButtons.Left) {
      Object.assign(caret, info.linecol)
      $.flush()
      selection.toCaret()
    }
  }

  // allow mouse down override by the consumer
  function onDown(): boolean | void { }
  function onUp(): boolean | void { }
  function onMove(): boolean | void { }

  const mouse = {
    info,
    handleDown,
    handleUp,
    handleMove,
    onDown,
    onUp,
    onMove,
  }

  return mouse
}
