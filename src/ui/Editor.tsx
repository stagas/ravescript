import { Sigui, type Signal } from 'sigui'
import { dom, isMobile } from 'utils'
import { Buffer, Caret, Dims, Kbd, Misc, View, type WordWrapProcessor } from '~/src/ui/editor/index.ts'

export * from '~/src/ui/editor/index.ts'

export function Editor({ code, width, height, wordWrapProcessor }: {
  code: Signal<string>
  width: Signal<number>
  height: Signal<number>
  wordWrapProcessor: WordWrapProcessor
}) {
  using $ = Sigui()

  const misc = Misc()
  const buffer = Buffer({ code, wordWrapProcessor })
  const dims = Dims()
  const caret = Caret({ buffer, dims, misc })
  const kbd = Kbd({ buffer, caret })
  const view = View({ width, height, dims, caret, buffer })

  function onFocus() {
    misc.info.isFocus = caret.info.isBlink = true
  }

  function onBlur() {
    misc.info.isFocus = caret.info.isVisible = caret.info.isBlink = false
  }

  // focus/blur
  $.fx(() => [
    dom.on(kbd, 'focus', onFocus),
    dom.on(kbd, 'blur', onBlur),
    dom.on(window, 'blur', onBlur),
  ])

  function focus() {
    kbd.focus({ preventScroll: true })
  }
  requestAnimationFrame(focus)

  function preventAndFocus(ev: Event) {
    ev.preventDefault()
    focus()
  }

  $.fx(() => [
    dom.on(window, 'focus', () => focus()),
    dom.on(view.el, 'pointerup', preventAndFocus),
    isMobile() && dom.on(view.el, 'touchend', preventAndFocus),
  ])

  const el = <div>
    {view.el}
    {kbd}
  </div> as HTMLDivElement

  return { el, focus }
}
