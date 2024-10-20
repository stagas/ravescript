import { isPointInRect, type Pane, type Point, type View } from 'editor'
import { Sigui, type Signal } from 'sigui'
import { assign, dom, isMobile, MouseButtons } from 'utils'

export interface InputMouse extends Point {
  isDown: boolean
  buttons: number
  ctrl: boolean
}

export interface InputHandlers {
  onKeyDown: (pane: Pane) => boolean | void
  onKeyUp: (pane: Pane) => boolean | void
  onMouseWheel: (pane: Pane) => boolean | void
  onMouseDown: (pane: Pane) => boolean | void
  onMouseUp: (pane: Pane) => boolean | void
  onMouseMove: (pane: Pane) => boolean | void
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
    // mobile keyboard
    dom.on(textarea, 'input', $.fn((ev: Event) => {
      const inputEvent = ev as InputEvent
      if (inputEvent.data) {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: inputEvent.data }))
        textarea.value = ''
      }
    })),

    // desktop keyboard
    dom.on(textarea, 'keydown', $.fn((ev: KeyboardEvent) => {
      info.pane.kbd.handleKeyDown(ev)
    })),

    dom.on(textarea, 'keyup', $.fn((ev: KeyboardEvent) => {
      info.pane.kbd.handleKeyUp(ev)
    })),

    // clipboard paste
    dom.on(textarea, 'paste', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      const text = ev.clipboardData?.getData('text/plain')
      const { history, selection, caret } = info.pane
      const { withHistory } = history
      if (text) {
        withHistory(() => {
          if (selection.isActive) {
            selection.deleteText()
          }
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
    ctrl: false,
    x: 0,
    y: 0,
  } satisfies InputMouse)

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

  // update cursor
  $.fx(() => {
    const { hoveringPane: pane } = info
    if (!pane) {
      $()
      view.info.cursor = 'default'
      return
    }
    const {
      isHovering,
      isHoveringScrollbarX,
      isHoveringScrollbarY,
      isDraggingScrollbarX,
      isDraggingScrollbarY,
    } = pane.info
    $()
    view.info.cursor = (!isHovering && !info.hoveringPane) ||
      (isHoveringScrollbarX || isDraggingScrollbarX) ||
      (isHoveringScrollbarY || isDraggingScrollbarY)
      ? 'default'
      : 'text'
  })

  function updatePaneMouse(pane: Pane) {
    pane.mouse.info.buttons = inputMouse.buttons
    pane.mouse.info.ctrl = inputMouse.ctrl
    assign(pane.mouse.info.actual, {
      x: inputMouse.x - pane.dims.info.rect.x,
      y: inputMouse.y - pane.dims.info.rect.y,
    })
    assign(pane.mouse.info, {
      x: inputMouse.x - pane.dims.info.rect.x - pane.dims.info.scrollX,
      y: inputMouse.y - pane.dims.info.rect.y - pane.dims.info.scrollY,
    })
  }

  function updateInputMouseFromEvent(ev: WheelEvent | PointerEvent | TouchEvent) {
    inputMouse.ctrl = ev.ctrlKey

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
      updateInputMouseFromEvent(ev)
      updatePaneMouse(info.pane)

      const { hoveringPane: pane } = info
      if (!pane) {
        return
      }

      ev.preventDefault()
      pane.mouse.info.wheel.x = ev.deltaX
      pane.mouse.info.wheel.y = ev.deltaY
      pane.mouse.handleWheel()
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
      info.pane.mouse.info.ctrl = inputMouse.ctrl
      info.pane.mouse.handleUp()
    })),

    dom.on(window, isMobile() ? 'touchmove' : 'pointermove', $.fn((ev: PointerEvent | TouchEvent) => {
      ev.preventDefault()
      updateInputMouseFromEvent(ev)
      info.pane.mouse.info.ctrl = inputMouse.ctrl
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
