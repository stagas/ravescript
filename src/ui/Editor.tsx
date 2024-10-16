import { Input, Misc, Pane, Rect, View, type InputHandlers, type WordWrapProcessor } from 'editor'
import { Sigui, type $, type Signal } from 'sigui'
import type { Source, Token } from '~/src/lang/tokenize.ts'

export type Editor = ReturnType<typeof Editor>

export function Editor({ code, width, height, colorize, tokenize, wordWrapProcessor, inputHandlers }: {
  code: Signal<string>
  width: Signal<number>
  height: Signal<number>
  colorize: (token: Token) => { fill: string, stroke: string }
  tokenize: (source: Source) => Generator<Token, void, unknown>
  wordWrapProcessor: WordWrapProcessor
  inputHandlers: InputHandlers
}) {
  using $ = Sigui()

  const misc = Misc()
  const view = View({ width, height })

  // initial pane
  const pane = createPane({
    rect: $(Rect(), { x: 0, y: 0, w: width, h: height }),
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
      inputHandlers,
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
