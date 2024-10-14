import { Input, Misc, Pane, Rect, View, type InputMouse, type Linecol, type WordWrapProcessor } from 'editor'
import { Sigui, type $, type Signal } from 'sigui'
import type { Source, Token } from '~/src/lang/tokenize.ts'

export function Editor({ code, width, height, colorize, tokenize, wordWrapProcessor, onMouseDown, onMouseUp, onMouseMove, }: {
  code: Signal<string>
  width: Signal<number>
  height: Signal<number>
  colorize: (token: Token) => { fill: string, stroke: string }
  tokenize: (source: Source) => Generator<Token, void, unknown>
  wordWrapProcessor: WordWrapProcessor
  onMouseDown: (pane: Pane) => boolean | void
  onMouseUp: (pane: Pane) => boolean | void
  onMouseMove: (pane: Pane) => boolean | void
}) {
  using $ = Sigui()

  const misc = Misc()
  const view = View({ width, height })

  // initial pane
  const pane = createPane({
    rect: $(Rect(), { x: 20, y: 20, w: 193, h: 200 }),
    code,
  })

  const info = $({
    pane,
    panes: new Set([pane])
  })

  const input = Input({
    view,
    pane: info.$.pane,
    panes: info.$.panes,
  })

  function createPane({ rect, code }: {
    rect: $<Rect>
    code: Signal<string>
  }) {
    return Pane({
      misc,
      view,
      rect,
      code,
      colorize,
      tokenize,
      wordWrapProcessor,
      onMouseDown,
      onMouseUp,
      onMouseMove,
    })
  }

  function addPane(pane: Pane) {
    info.panes = new Set([...info.panes, pane])
    view.anim.ticks.add(pane.draw.draw)
  }

  function removePane(pane: Pane) {
    info.panes.delete(pane)
    info.panes = new Set(info.panes)
    view.anim.ticks.delete(pane.draw.draw)
  }

  addPane(pane)

  return {
    el: view.el,
    info,
    focus: input.focus,
    view,
    createPane,
    addPane,
    removePane
  }
}
