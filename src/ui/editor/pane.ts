import { Buffer, Caret, Dims, Draw, History, Kbd, Misc, Mouse, Selection, type Rect, type WordWrapProcessor } from 'editor'
import { Sigui, type $, type Signal } from 'sigui'
import type { Source, Token } from '~/src/lang/tokenize.ts'
import type { View } from '~/src/ui/editor/view.tsx'

export interface PaneInfo {
  isFocus: boolean
}

export type Pane = ReturnType<typeof Pane>

export function Pane({ misc, view, code, rect, colorize, tokenize, wordWrapProcessor, onMouseDown, onMouseUp, onMouseMove, }: {
  misc: Misc
  view: View
  code: Signal<string>
  rect: $<Rect>
  colorize: (token: Token) => { fill: string, stroke: string }
  tokenize: (source: Source) => Generator<Token, void, unknown>
  wordWrapProcessor: WordWrapProcessor
  onMouseDown: (pane: Pane) => boolean | void
  onMouseUp: (pane: Pane) => boolean | void
  onMouseMove: (pane: Pane) => boolean | void
}) {
  using $ = Sigui()

  const info: PaneInfo = $({
    isFocus: false,
  })

  const dims = Dims({ rect })
  const buffer = Buffer({ dims, code, tokenize, wordWrapProcessor })
  const caret = Caret({ paneInfo: info, buffer })
  const selection = Selection({ buffer, caret })
  const history = History({ selection, buffer, caret })
  const kbd = Kbd({ paneInfo: info, misc, dims, selection, buffer, caret, history })
  const draw = Draw({ view, selection, caret, dims, buffer, colorize })
  const mouse = Mouse({ paneInfo: info, selection, caret, draw })
  const pane = {
    info,
    dims,
    buffer,
    caret,
    selection,
    history,
    kbd,
    draw,
    mouse,
  }
  mouse.onDown = () => onMouseDown(pane)
  mouse.onUp = () => onMouseUp(pane)
  mouse.onMove = () => onMouseMove(pane)
  return pane
}
