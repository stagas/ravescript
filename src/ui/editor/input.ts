import { isPointInRect, Linecol, Mouse, type Misc, type Pane, type View } from 'editor'
import { Sigui, type Signal } from 'sigui'
import { assign, dom, isMobile, MouseButtons } from 'utils'

export type Input = ReturnType<typeof Input>

export function Input({ misc, view, pane, panes }: {
  misc: Misc
  view: View
  pane: Signal<Pane>
  panes: Signal<Set<Pane>>
}) {
  using $ = Sigui()

  const { textarea, el } = view

  const info = $({
    pane,
    panes,
    hoveringPane: null as null | Pane,
  })

  // read keyboard input
  $.fx(() => [
    // mobile
    dom.on(textarea, 'input', $.fn((ev: Event) => {
      const inputEvent = ev as InputEvent
      if (inputEvent.data) {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: inputEvent.data }))
        textarea.value = ''
      }
    })),

    // desktop
    dom.on(textarea, 'keydown', ev => info.pane.kbd.handleKey(ev)),

    // clipboard
    dom.on(textarea, 'paste', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      const text = ev.clipboardData?.getData('text/plain')
      const { history, selection, caret } = info.pane
      const { withHistory } = history
      if (text) {
        withHistory(() => {
          selection.reset()
          caret.insert(text)
          caret.index += text.length
          $.flush()
          selection.toCaret()
        })
      }
    })),

    dom.on(textarea, 'copy', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      const { selection } = info.pane
      ev.clipboardData?.setData('text/plain', selection.text)
    })),

    dom.on(textarea, 'cut', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      const { history, selection } = info.pane
      const { withHistory } = history
      ev.clipboardData?.setData('text/plain', selection.text)
      withHistory(selection.deleteText)
    })),
  ])

  // mouse
  const inputMouse = $({
    isDown: false,
    buttons: 0,
    count: 0,
    x: 0,
    y: 0,
  })

  const CLICK_TIMEOUT = 350

  // update cursor when hovering pane
  $.fx(() => {
    const { hoveringPane } = info
    $()
    view.info.cursor = hoveringPane ? 'text' : 'default'
  })

  // update view scrollbars when hovering pane
  $.fx(() => {
    const { hoveringPane: pane } = info
    $()
    if (pane) {
      pane.draw.info.showScrollbars = true
      return () => pane.draw.info.showScrollbars = false
    }
  })

  $.fx(() =>
    dom.on(document, 'pointerleave', () => {
      info.hoveringPane = null
    })
  )

  function updatePaneMouse(pane: Pane) {
    assign(pane.mouse.info, {
      x: inputMouse.x - pane.dims.info.rect.x - pane.dims.info.scrollX,
      y: inputMouse.y - pane.dims.info.rect.y - pane.dims.info.scrollY,
    })
  }

  function updateMouseFromEvent(ev: PointerEvent | Touch) {
    const c = el.getBoundingClientRect()
    inputMouse.x = ev.pageX - c.left
    inputMouse.y = ev.pageY - c.top

    if (info.hoveringPane?.mouse.info.isDown) {
      updatePaneMouse(info.hoveringPane)
      return
    }

    out: {
      for (const pane of info.panes) {
        if (isPointInRect(inputMouse, pane.dims.info.rect)) {
          info.hoveringPane = pane
          updatePaneMouse(pane)
          break out
        }
      }
      info.hoveringPane = null
    }
  }

  $.fx(() => [
    dom.on(el, 'contextmenu', dom.prevent.stop),

    dom.on(el, 'wheel', $.fn((ev: WheelEvent) => {
      ev.preventDefault()
      const { deltaX, deltaY } = ev
      const { hoveringPane: pane } = info
      if (!pane) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        pane.dims.info.scrollY -= deltaY * .35
      }
      else {
        pane.dims.info.scrollX -= deltaX * .35
      }
    }), { passive: false }),

    dom.on(el, 'pointerdown', $.fn((ev: PointerEvent) => {
      ev.preventDefault()
      updateMouseFromEvent(ev)

      const { hoveringPane: pane } = info
      if (!pane) {
        // info.pane.info.isFocus = false
        return
      }

      info.pane.info.isFocus = false
      info.pane = pane
      pane.info.isFocus = true

      const { selection, caret, mouse } = pane

      mouse.info.buttons = ev.buttons

      if (mouse.info.buttons & MouseButtons.Middle) {
        // TODO: implement middle click
        return
      }

      if (mouse.info.buttons & MouseButtons.Right) {
        // TODO: implement right click
        return
      }

      inputMouse.isDown = true
      mouse.info.isDown = true

      clearTimeout(mouse.info.clickTimeout)
      mouse.info.clickTimeout = setTimeout(() => mouse.info.count = 0, CLICK_TIMEOUT)
      mouse.info.count++

      switch (mouse.info.count) {
        case 1: {
          selection.reset()
          Object.assign(caret, mouse.info.linecol)
          caret.visualXIntent = caret.col
          $.flush()
          selection.reset()
          break
        }
        case 2: {
          selection.selectWord()
          break
        }
        case 3: {
          selection.selectBlock()
          break
        }
        case 4: {
          selection.selectLine()
          break
        }
        default: {
          selection.reset()
          mouse.info.count = 0
          break
        }
      }
      caret.info.isBlink = false
    })),
    dom.on(window, 'pointerup', $.fn((ev: PointerEvent) => {
      updateMouseFromEvent(ev)
      const { mouse, caret } = info.pane
      inputMouse.isDown = false
      mouse.info.isDown = false
      mouse.info.buttons = 0

      caret.info.isBlink = true
    })),
    dom.on(window, 'pointermove', $.fn((ev: PointerEvent) => {
      updateMouseFromEvent(ev)
      const { selection, caret, mouse } = info.pane
      if (mouse.info.buttons & MouseButtons.Left) {
        Object.assign(caret, mouse.info.linecol)
        $.flush()
        selection.toCaret()
      }
    })),
  ])

  // focus/blur
  function focus() {
    textarea.focus({ preventScroll: true })
  }

  function preventAndFocus(ev: Event) {
    ev.preventDefault()
    focus()
  }

  function onFocus() {
    info.pane.info.isFocus = info.pane.caret.info.isBlink = true
  }

  function onBlur() {
    if (inputMouse.isDown) {
      // if (info.pane.info.isFocus) {
      //   info.pane.caret.info.isVisible = true
      // }
      return
    }
    info.pane.info.isFocus = info.pane.caret.info.isVisible = info.pane.caret.info.isBlink = false
  }

  $.fx(() => [
    dom.on(textarea, 'focus', onFocus),
    dom.on(textarea, 'blur', onBlur),
    dom.on(window, 'blur', onBlur),
  ])

  $.fx(() => [
    dom.on(window, 'focus', () => focus()),
    dom.on(el, 'pointerup', preventAndFocus),
    isMobile() && dom.on(el, 'touchend', preventAndFocus),
  ])

  requestAnimationFrame(focus)

  return { focus }
}
