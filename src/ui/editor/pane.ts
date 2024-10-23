import { Buffer, Caret, Dims, Draw, History, Kbd, Misc, Mouse, Selection, type InputHandlers, type Rect, type WordWrapProcessor } from 'editor'
import { Sigui, type $, type Signal } from 'sigui'
import type { Source, Token } from '~/src/lang/tokenize.ts'
import type { View } from '~/src/ui/editor/view.tsx'

export interface PaneInfo {
  isFocus: boolean
  isHovering: boolean
  isHoveringScrollbarX: boolean
  isHoveringScrollbarY: boolean
  isDraggingScrollbarX: boolean
  isDraggingScrollbarY: boolean
}

export type Pane = ReturnType<typeof Pane>

export function Pane({ misc, view, code, rect, colorize, tokenize, wordWrapProcessor, inputHandlers }: {
  misc: Misc
  view: View
  code: Signal<string>
  rect: $<Rect>
  colorize: (token: Token) => { fill: string, stroke: string }
  tokenize: (source: Source) => Generator<Token, void, unknown>
  wordWrapProcessor: WordWrapProcessor
  inputHandlers: InputHandlers
}) {
  using $ = Sigui()

  const info: PaneInfo = $({
    isFocus: false,
    isHovering: false,
    isHoveringScrollbarX: false,
    isHoveringScrollbarY: false,
    isDraggingScrollbarX: false,
    isDraggingScrollbarY: false,
  } satisfies PaneInfo)

  const dims = Dims({ rect })
  const buffer = Buffer({ dims, code, tokenize, wordWrapProcessor })
  const caret = Caret({ buffer })
  const selection = Selection({ buffer, caret })
  const history = History({ selection, buffer, caret })
  const kbd = Kbd({ paneInfo: info, misc, dims, selection, buffer, caret, history })
  const draw = Draw({ paneInfo: info, view, selection, caret, dims, buffer, colorize })
  const mouse = Mouse({ paneInfo: info, dims, selection, caret, draw })
  const pane = {
    info,
    view,
    dims,
    buffer,
    caret,
    selection,
    history,
    kbd,
    draw,
    mouse,
  }
  kbd.onKeyDown = () => inputHandlers.onKeyDown(pane)
  kbd.onKeyUp = () => inputHandlers.onKeyUp(pane)
  mouse.onWheel = () => inputHandlers.onMouseWheel(pane)
  mouse.onDown = () => inputHandlers.onMouseDown(pane)
  mouse.onUp = () => inputHandlers.onMouseUp(pane)
  mouse.onMove = () => inputHandlers.onMouseMove(pane)
  return pane
}
