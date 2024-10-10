import { Sigui, type Signal } from 'sigui'
import { dom, isMobile } from 'utils'
import type { Source, Token } from '~/src/lang/tokenize.ts'
import { Buffer, Caret, Dims, Kbd, Misc, View, type WordWrapProcessor } from '~/src/ui/editor/index.ts'

export * from '~/src/ui/editor/index.ts'

export function Editor({ code, width, height, colorize, tokenize, wordWrapProcessor }: {
  code: Signal<string>
  width: Signal<number>
  height: Signal<number>
  colorize: (token: Token) => { fill: string, stroke: string }
  tokenize: (source: Source) => Generator<Token, void, unknown>
  wordWrapProcessor: WordWrapProcessor
}) {
  using $ = Sigui()

  const misc = Misc()
  const buffer = Buffer({ code, tokenize, wordWrapProcessor })
  const dims = Dims()
  const caret = Caret({ buffer, dims, misc })
  const kbd = Kbd({ buffer, caret })
  const view = View({ width, height, dims, caret, buffer, colorize })

  // focus/blur
  function focus() {
    kbd.focus({ preventScroll: true })
  }

  function preventAndFocus(ev: Event) {
    ev.preventDefault()
    focus()
  }

  function onFocus() {
    misc.info.isFocus = caret.info.isBlink = true
  }

  function onBlur() {
    misc.info.isFocus = caret.info.isVisible = caret.info.isBlink = false
  }

  $.fx(() => [
    dom.on(kbd, 'focus', onFocus),
    dom.on(kbd, 'blur', onBlur),
    dom.on(window, 'blur', onBlur),
  ])

  $.fx(() => [
    dom.on(window, 'focus', () => focus()),
    dom.on(view.el, 'pointerup', preventAndFocus),
    isMobile() && dom.on(view.el, 'touchend', preventAndFocus),
  ])

  requestAnimationFrame(focus)

  const el = <div>
    {view.el}
    {kbd}
  </div> as HTMLDivElement

  return { el, focus }
}
