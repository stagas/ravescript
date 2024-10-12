import { Buffer, Caret, Dims, History, Kbd, Misc, Mouse, Selection, View, type WordWrapProcessor } from 'editor'
import { Sigui, type Signal } from 'sigui'
import { dom, isMobile } from 'utils'
import type { Source, Token } from '~/src/lang/tokenize.ts'

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
  const dims = Dims({ width, height })
  const buffer = Buffer({ code, tokenize, wordWrapProcessor })
  const caret = Caret({ buffer, misc })
  const selection = Selection({ buffer, caret })
  const history = History({ selection, buffer, caret })
  const kbd = Kbd({ misc, dims, selection, buffer, caret, history })
  const view = View({ selection, caret, dims, buffer, colorize })
  const mouse = Mouse({ selection, caret, view })

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
    if (mouse.info.isDown) return
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

  return { el, focus, buffer, view, anim: view.anim, widgets: view.widgets }
}
