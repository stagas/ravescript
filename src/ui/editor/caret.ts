import { beginOfLine, Close, Open, Point, type Buffer, type PaneInfo } from 'editor'
import { Sigui } from 'sigui'
import { assign, clamp } from 'utils'

export type Caret = ReturnType<typeof Caret>

export function Caret({ buffer }: {
  buffer: Buffer,
}) {
  using $ = Sigui()

  const info = $({
    x: 0,
    y: 0,
    index: 0,
    visual: $(Point()),
    visualXIntent: 0,
    blinkReset: 0,
    isBlink: true,
    isVisible: true,
  })

  const caret = info

  // set caret points from index
  $.fx(() => {
    const { index } = caret
    $()
    caret.blinkReset++
    assign(caret.visual, buffer.indexToVisualPoint(index))
    assign(caret, buffer.indexToLogicalPoint(index))
  })

  // set index from visual point
  $.fx(() => {
    const { x, y } = caret.visual
    $()
    caret.index = buffer.visualPointToIndex({ x, y })
  })

  // set index from logical point
  $.fx(() => {
    const { x, y } = caret
    $()
    caret.index = buffer.logicalPointToIndex({ x, y })
  })

  function doBackspace() {
    if (caret.index > 0) {
      const { code, lines } = buffer
      let chars = 1
      if (beginOfLine(lines[caret.y]) === caret.x && caret.x > 0) {
        chars = (2 - (caret.x % 2))
      }
      const before = code[caret.index - 1]
      const after = code[caret.index]
      let index = caret.index
      if (Open[before] && Close[after]) index++
      buffer.code = code.slice(0, caret.index - chars) + code.slice(index)
      moveByChars(-chars)
      $.flush()
    }
  }

  function doDelete() {
    const { code } = buffer
    const { index } = caret
    if (index < code.length) {
      buffer.code = code.slice(0, index) + code.slice(index + 1)
    }
  }

  function moveHome() {
    const { linesVisual } = buffer.info
    const bx = beginOfLine(linesVisual[caret.visual.y]?.text ?? '')
    const vx = bx === caret.visual.x ? 0 : bx
    caret.index = buffer.visualPointToIndex({
      x: vx,
      y: caret.visual.y
    })
  }

  function moveEnd() {
    caret.index = buffer.visualPointToIndex({
      x: buffer.info.linesVisual[caret.visual.y]?.text.length ?? 0,
      y: caret.visual.y
    })
  }

  function moveByLines(dy: number) {
    const { linesVisual } = buffer.info
    let newX = caret.visualXIntent
    let newY = caret.visual.y + dy
    if (newY < 0) {
      if (caret.visual.y === 0) newX = 0
      newY = 0
    }
    const lastY = linesVisual.length - 1
    if (newY > lastY) {
      if (caret.visual.y === lastY) {
        newX = linesVisual[lastY].text.length
      }
      newY = lastY
    }
    if (newY >= 0 && newY <= linesVisual.length) {
      caret.index = buffer.visualPointToIndex({
        x: newX,
        y: newY
      })
    }
  }

  function moveByChars(chars: number) {
    caret.index = clamp(0, buffer.length, caret.index + chars)
  }

  function moveByWord(dir: number) {
    const { code, words } = buffer.info
    let index = dir > 0 ? code.length : 0
    for (let i = dir > 0 ? 0 : words.length - 1; dir > 0 ? i < words.length : i >= 0; dir > 0 ? i++ : i--) {
      const word = words[i]
      if ((dir > 0 && word.index > caret.index) || (dir < 0 && word.index < caret.index)) {
        index = word.index
        break
      }
    }
    caret.index = index
  }

  function insert(key: string) {
    const { code } = buffer
    buffer.code =
      code.slice(0, caret.index)
      + key
      + code.slice(caret.index)
    $.flush()
  }

  return $({
    info,
    x: caret.$.x,
    y: caret.$.y,
    line: caret.visual.$.y,
    col: caret.visual.$.x,
    index: caret.$.index,
    visual: caret.$.visual,
    visualXIntent: caret.$.visualXIntent,
    doBackspace,
    doDelete,
    moveHome,
    moveEnd,
    moveByLines,
    moveByChars,
    moveByWord,
    insert,
  })
}
