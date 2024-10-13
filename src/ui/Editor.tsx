import { Input, Misc, Pane, Rect, View, type WordWrapProcessor } from 'editor'
import { Sigui, type $, type Signal } from 'sigui'
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
  const view = View({ width, height })

  function createPane({ rect, code }: {
    rect: $<Rect>
    code: Signal<string>
  }) {
    const pane = Pane({
      misc,
      view,
      rect,
      code,
      colorize,
      tokenize,
      wordWrapProcessor
    })
    return pane
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

  const pane = createPane({
    rect: $(Rect(), { x: 20, y: 20, w: 193, h: 200 }),
    code,
  })

  const info = $({
    pane,
    panes: new Set([pane])
  })

  const input = Input({
    misc,
    view,
    pane: info.$.pane,
    panes: info.$.panes,
  })

  addPane(pane)

  const el = <div>
    {view.el}
    {view.textarea}
  </div> as HTMLDivElement

  return {
    el,
    info,
    focus: input.focus,
    view,
    createPane,
    addPane,
    removePane
  }
}
