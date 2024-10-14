import { isPointInRect, type Pane, type Point, type View } from 'editor'
import { Sigui, type Signal } from 'sigui'
import { assign, dom, isMobile, MouseButtons } from 'utils'

export interface InputMouse extends Point {
  isDown: boolean
  buttons: number
}

export type Input = ReturnType<typeof Input>

export function Input({ view, pane, panes }: {
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

    // clipboard paste
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

    // clipboard copy
    dom.on(textarea, 'copy', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      const { selection } = info.pane
      ev.clipboardData?.setData('text/plain', selection.text)
    })),

    // clipboard cut
    dom.on(textarea, 'cut', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      const { history, selection } = info.pane
      const { withHistory } = history
      ev.clipboardData?.setData('text/plain', selection.text)
      withHistory(selection.deleteText)
    })),
  ])

  // input mouse
  const inputMouse: InputMouse = $({
    isDown: false,
    buttons: 0,
    x: 0,
    y: 0,
  })

  // update hovering info
  $.fx(() => {
    const { hoveringPane: pane } = info
    $()
    if (pane) {
      pane.info.isHovering = true
      return () => {
        pane.info.isHovering = false
      }
    }
  })

  // unset hoveringPane when pointer leaves the window
  $.fx(() =>
    dom.on(document, 'pointerleave', () => {
      info.hoveringPane = null
    })
  )

  function updatePaneMouse(pane: Pane) {
    pane.mouse.info.buttons = inputMouse.buttons
    assign(pane.mouse.info.actual, {
      x: inputMouse.x - pane.dims.info.rect.x,
      y: inputMouse.y - pane.dims.info.rect.y,
    })
    assign(pane.mouse.info, {
      x: inputMouse.x - pane.dims.info.rect.x - pane.dims.info.scrollX,
      y: inputMouse.y - pane.dims.info.rect.y - pane.dims.info.scrollY,
    })
  }

  function updateInputMouseFromEvent(ev: PointerEvent | TouchEvent) {
    if (ev instanceof TouchEvent) {
      const touch = ev.touches[0] ?? { pageX: 0, pageY: 0 }
      inputMouse.x = touch.pageX
      inputMouse.y = touch.pageY
      inputMouse.buttons = MouseButtons.Left
    }
    else {
      inputMouse.x = ev.pageX
      inputMouse.y = ev.pageY
      inputMouse.buttons = ev.buttons
    }

    const c = el.getBoundingClientRect()
    inputMouse.x -= c.left
    inputMouse.y -= c.top

    // mouse down had started inside a pane
    // so we update only that pane even if outside of it
    if (info.pane.mouse.info.isDown) {
      info.hoveringPane = info.pane
      updatePaneMouse(info.pane)
      return
    }

    // find the pane mouse is hovering
    out: {
      for (const pane of info.panes) {
        if (isPointInRect(inputMouse, pane.dims.info.rect)) {
          // found pane
          info.hoveringPane = pane
          updatePaneMouse(pane)
          break out
        }
      }
      // no pane found under input mouse, unset hoveringPane
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

    dom.on(el, isMobile() ? 'touchstart' : 'pointerdown', $.fn((ev: PointerEvent | TouchEvent) => {
      if (!isMobile()) ev.preventDefault()
      updateInputMouseFromEvent(ev)
      inputMouse.isDown = true

      const { pane, hoveringPane } = info

      // click outside panes, unset current pane focus
      if (!hoveringPane) {
        pane.info.isFocus = false
        return
      }

      pane.info.isFocus = false
      info.pane = hoveringPane
      info.pane.mouse.handleDown()
    })),

    dom.on(window, isMobile() ? 'touchend' : 'pointerup', $.fn((ev: PointerEvent | TouchEvent) => {
      ev.preventDefault()
      updateInputMouseFromEvent(ev)
      inputMouse.isDown = false
      info.pane.mouse.handleUp()
    })),

    dom.on(window, isMobile() ? 'touchmove' : 'pointermove', $.fn((ev: PointerEvent | TouchEvent) => {
      ev.preventDefault()
      updateInputMouseFromEvent(ev)
      info.pane.mouse.handleMove()
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
    info.pane.info.isFocus = true
  }

  function onBlur() {
    if (inputMouse.isDown) {
      if (info.pane.info.isFocus) {
        info.pane.caret.info.isVisible = false
        return
      }
    }
    info.pane.info.isFocus = false
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
