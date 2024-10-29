import { BRACKET, Buffer, findMatchingBrackets, Linecol, pointToLinecol, type Caret } from 'editor'
import { Sigui } from 'sigui'
import { assign } from 'utils'

export type Selection = ReturnType<typeof Selection>

export function Selection({ buffer, caret }: {
  buffer: Buffer
  caret: Caret
}) {
  using $ = Sigui()

  const info = $({
    start: $(Linecol()),
    end: $(Linecol()),
    startIndex: 0,
    endIndex: 0,
    sorted: $({
      get start() {
        const { line: l1, col: c1 } = info.start
        const { line: l2, col: c2 } = info.end
        return l1 < l2 || (l1 === l2 && c1 < c2) ? info.start : info.end
      },
      get end() {
        return info.end === info.sorted.start ? info.start : info.end
      },
      get startIndex() {
        return info.startIndex < info.endIndex ? info.startIndex : info.endIndex
      },
      get endIndex() {
        return info.endIndex > info.startIndex ? info.endIndex : info.startIndex
      },
      get forward() {
        return info.startIndex < info.endIndex
      },
    }),
    get isActive() {
      return info.startIndex !== info.endIndex
    },
    get text() {
      return buffer.code.slice(info.startIndex, info.endIndex)
    },
  })

  // update start and end index
  $.fx(() => {
    const { line: y1, col: x1 } = info.start
    const { line: y2, col: x2 } = info.end
    $()
    info.startIndex = buffer.visualPointToIndex({ x: x1, y: y1 })
    info.endIndex = buffer.visualPointToIndex({ x: x2, y: y2 })
  })

  // update points from start and end index
  $.fx(() => {
    const { startIndex, endIndex } = info
    $()
    assign(info.start, pointToLinecol(buffer.indexToVisualPoint(startIndex)))
    assign(info.end, pointToLinecol(buffer.indexToVisualPoint(endIndex)))
  })

  function reset() {
    info.start.line = info.end.line = caret.visual.y
    info.start.col = info.end.col = caret.visual.x
    $.flush()
  }

  function toCaret() {
    info.end.line = caret.visual.y
    info.end.col = caret.visual.x
    $.flush()
  }

  function deleteText() {
    const { startIndex, endIndex } = info.sorted
    const { code } = buffer
    caret.index = startIndex
    $.flush()
    buffer.code = code.slice(0, startIndex) + code.slice(endIndex)
    reset()
    $.flush()
    // somehow caret.visual is not updated correctly, so we apply it here again
    assign(caret.visual, buffer.indexToVisualPoint(startIndex))
  }

  function selectAll() {
    info.start.line = 0
    info.start.col = 0
    info.end.line = buffer.info.linesVisual.length - 1
    info.end.col = buffer.info.linesVisual.at(-1).text.length
    $.flush()
  }

  function selectWord(expand = false) {
    const word = buffer.wordUnderVisualPoint(caret.visual)
    if (word) {
      const { y } = caret.visual
      const start = { col: word.index, line: y }
      const end = { col: word.index + word[0].length, line: y }
      if (expand) {
        assign(info.end, info.sorted.forward ? end : start)
      }
      else {
        assign(info.start, start)
        assign(info.end, end)
      }

      // We exclude brackets from being selected as words, so
      // that we fallthrough to a matching brackets selection.
      if (word[0].length === 1 && BRACKET.test(word[0])) return false
      return Boolean(word[0].trim().length)
    }
    return false
  }

  function selectBlock(exclusive?: boolean) {
    const index = buffer.visualPointToIndex(caret.visual)
    const match = findMatchingBrackets(buffer.code, index)
    if (match) {
      const exn = Number(exclusive ?? 0)
      let start = match[0] + exn
      let end = match[1] - exn + 1
      // swap direction depending on which side we are closest.
      if (Math.abs(end - index) > Math.abs(start - index)) {
        [start, end] = [end, start]
      }
      assign(info.start, pointToLinecol(buffer.indexToVisualPoint(start)))
      assign(info.end, pointToLinecol(buffer.indexToVisualPoint(end)))
      Object.assign(caret, info.end)
      return true
    }
    return false
  }

  function selectLine() {
    const { y } = caret
    const line = buffer.info.lines[y]
    const start = buffer.logicalPointToIndex({ x: 0, y })
    const end = buffer.logicalPointToIndex({ x: line.length, y })
    assign(info.start, pointToLinecol(buffer.indexToVisualPoint(start)))
    assign(info.end, pointToLinecol(buffer.indexToVisualPoint(end)))
    Object.assign(caret, info.end)
  }

  return $({
    info,
    start: info.start,
    end: info.end,
    startIndex: info.$.startIndex,
    endIndex: info.$.endIndex,
    isActive: info.$.isActive,
    text: info.$.text,
    sorted: info.sorted,
    reset,
    toCaret,
    deleteText,
    selectAll,
    selectWord,
    selectBlock,
    selectLine,
  })
}
