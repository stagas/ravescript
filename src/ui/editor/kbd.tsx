import { beginOfLine, Buffer, escapeRegExp, findMatchingBrackets, linecolToPoint, pointToLinecol, type Caret, type Dims, type History, type Misc, type Selection } from 'editor'
import { Sigui } from 'sigui'
import { assign } from 'utils'

export function Kbd({ misc, dims, selection, buffer, caret, history }: {
  misc: Misc
  dims: Dims
  selection: Selection
  buffer: Buffer
  caret: Caret
  history: History
}) {
  using $ = Sigui()

  const ignoredKeys = 'cvxjrtn=+-'

  const { withHistory, withHistoryDebounced, undo, redo } = history

  function tabIndent(shift: boolean) {
    let index: number = Infinity
    let lns: string[]
    let y: number
    const { lines } = buffer
    const text = lines[caret.y]
    if (selection.isActive) {
      const { start, end } = selection.sorted
      const p1 = buffer.visualPointToLogicalPoint(linecolToPoint(start))
      const p2 = buffer.visualPointToLogicalPoint(linecolToPoint(end))
      const { y: y1 } = p1
      const { y: y2 } = p2
      for (let y = y1; y <= y2; y++) {
        index = Math.min(index, beginOfLine(lines[y]))
      }
      y = y1
      lns = lines.slice(y1, y2 + 1)
    }
    else if (shift) {
      index = beginOfLine(text)
      y = caret.y
      lns = [lines[y]]
    }
    else {
      caret.insert('  ')
      caret.index += 2
      return
    }

    const dec = shift
    if (dec && !index) return

    let diff = 0
    const tabSize = 2
    const tab = ' '.repeat(tabSize)
    lns.forEach((text, i) => {
      if (dec) {
        diff = -tabSize
        text = text.replace(new RegExp(`^(\t| {1,${tabSize}})`, 'gm'), '')
      }
      else {
        diff = +tabSize
        text = text.length === 0 ? tab : text.replace(/^[^\n]/gm, `${tab}$&`)
      }
      lines[y + i] = text
    })

    buffer.code = lines.join('\n')

    if (selection.isActive) {
      // TODO
    }
    else {
      caret.visual.x = Math.max(0, caret.visual.x + diff)
      $.flush()
      selection.reset()
    }
  }

  function toggleSingleComment() {
    const comment = misc.info.commentSingle
    const { startIndex, end, endIndex, forward } = selection.sorted
    const { lines } = buffer

    const p1 = buffer.indexToLogicalPoint(startIndex)
    const p2 = buffer.indexToLogicalPoint(endIndex)

    const y1 = p1.y
    const y2 = p1.y === p2.y || end.col > 0 ? p2.y : p2.y - 1

    if (y1 === y2) {
      const line = lines[y1]
      const begin = beginOfLine(line)
      const spaces = line.slice(0, begin)
      let rest = line.slice(begin)
      if (rest.startsWith(comment)) {
        const r = new RegExp(`^${escapeRegExp(comment)}${spaces.length % 2 === 0 ? ' ?' : ''}`, 'm')
        const length = rest.length
        rest = rest.replace(r, '')
        const chars = length - rest.length
        selection.startIndex -= chars
        selection.endIndex -= chars
      }
      else {
        const commented = (spaces.length > 0 && spaces.length % 2 !== 0 ? ' ' : '') + comment + ' '
        rest = commented + rest
        selection.startIndex += commented.length
        selection.endIndex += commented.length
      }
      lines[y1] = spaces + rest
    }
    else {
      // determine if we should add or remove comments
      const slice = lines.slice(y1, y2 + 1)
      const shouldRemove = slice.every(l => l.trimStart().startsWith(comment))

      // find leftmost indent
      let indent = Infinity
      for (let y = y1; y <= y2; y++) {
        const begin = beginOfLine(lines[y])
        indent = Math.min(begin, indent)
      }

      let diff = 0
      let firstDiff = 0
      let first = true
      if (shouldRemove) {
        for (let y = y1; y <= y2; y++) {
          const line = lines[y]
          const begin = beginOfLine(line)
          const spaces = line.slice(0, begin)
          let rest = line.slice(begin)
          const r = new RegExp(`^${escapeRegExp(comment)}${spaces.length % 2 === 0 ? ' ?' : ''}`, 'm')
          const length = rest.length
          rest = rest.replace(r, '')
          const chars = length - rest.length
          if (first) {
            firstDiff = chars
            first = false
          }
          diff += chars
          lines[y] = spaces + rest
        }
        if (forward) {
          selection.startIndex -= firstDiff
          selection.endIndex -= diff
        }
        else {
          selection.startIndex -= diff
          selection.endIndex -= firstDiff
        }
      }
      else {
        for (let y = y1; y <= y2; y++) {
          const line = lines[y]
          const spaces = line.slice(0, indent)
          const rest = line.slice(indent)
          const commented = comment + ' '
          if (first) {
            firstDiff = commented.length
            first = false
          }
          diff += commented.length
          lines[y] = spaces + commented + rest
        }
        if (forward) {
          selection.startIndex += firstDiff
          selection.endIndex += diff
        }
        else {
          selection.startIndex += diff
          selection.endIndex += firstDiff
        }
      }
    }

    buffer.lines = [...lines]
    $.flush()
    caret.index = selection.endIndex
  }

  function toggleDoubleComment() {
    const [c1, c2] = misc.info.commentDouble
    const { startIndex, end, endIndex, forward } = selection.sorted
    const { code } = buffer

    let before = code.slice(0, startIndex)
    let middle = code.slice(startIndex, endIndex)
    let after = code.slice(endIndex)

    if (before.trimEnd().endsWith(c1) && after.trimStart().startsWith(c2)) {
      const l = new RegExp(`${escapeRegExp(c1)}\\s*$`, 'm')
      const length = before.length
      before = before.replace(l, '')
      const removed = length - before.length
      const r = new RegExp(`^\\s*${escapeRegExp(c2)}`, 'm')
      after = after.replace(r, '')
      buffer.code = `${before}${middle}${after}`
      selection.startIndex -= removed
      selection.endIndex -= removed
    }
    else {
      buffer.code = `${before}${c1} ${middle} ${c2}${after}`
      selection.startIndex += c1.length + 1
      selection.endIndex += c1.length + 1
    }
    $.flush()
    caret.index = selection.endIndex
  }

  function toggleBlockComment() {
    const match = findMatchingBrackets(buffer.code, caret.index)
    if (match) {
      const c = misc.info.commentSingle
      const [b1, b2] = match
      const b1p = b1 + 1
      const { code } = buffer
      const before = code.slice(0, b1p)
      const middle = code.slice(b1p, b2)
      const after = code.slice(b2)
      if (middle.startsWith(c)) {
        buffer.code = `${before}${middle.slice(c.length)}${after}`
        if (caret.index > b1) caret.index--
      }
      else {
        buffer.code = `${before}${c}${middle}${after}`
        if (caret.index > b1) caret.index++
      }
    }
  }

  function duplicateSelection() {
    const { length } = selection.text
    caret.insert(selection.text)
    caret.index += length
    selection.info.startIndex += length
    selection.info.endIndex += length
  }

  function duplicateLine() {
    const { index } = caret
    caret.index = buffer.logicalPointToIndex({ x: 0, y: caret.y })
    $.flush()
    const line = buffer.info.lines[caret.y] + '\n'
    caret.insert(line)
    caret.index = index + line.length
  }

  function moveLines(dy: number) {
    const { start, end } = selection.sorted
    const p1 = buffer.visualPointToLogicalPoint(linecolToPoint(start))
    const p2 = buffer.visualPointToLogicalPoint(linecolToPoint(end))
    const { y: y1 } = p1
    const { y: y2 } = p2

    if (y1 === 0 && dy < 0) return
    if (y2 === buffer.lines.length - 1 && dy > 0) return
    if (y1 + dy < 0) dy = -y1
    if (y2 + dy >= buffer.lines.length) dy = buffer.lines.length - y2
    if (!dy) return

    const slice = buffer.lines.splice(y1, y2 - y1 + (p2.x > 0 || !selection.isActive ? 1 : 0))
    buffer.lines.splice(y1 + dy, 0, ...slice)
    buffer.lines = [...buffer.lines]
    p1.y += dy
    p2.y += dy
    caret.y += dy
    assign(start, pointToLinecol(buffer.logicalPointToVisualPoint(p1)))
    assign(end, pointToLinecol(buffer.logicalPointToVisualPoint(p2)))
  }

  const handleKey = $.fn((ev: KeyboardEvent): void => {
    if (ev.ctrlKey && ignoredKeys.includes(ev.key.toLowerCase())) return

    ev.preventDefault()

    caret.info.blinkReset++

    let { key } = ev
    const ctrl = ev.ctrlKey || ev.metaKey
    const alt = ev.altKey
    let shift = ev.shiftKey

    if (key === 'Enter') key = '\n'

    function withSelection(fn: () => void, force = false) {
      if (!shift && selection.isActive) selection.reset()
      if (force || (shift && !selection.isActive)) {
        selection.reset()
      }
      fn()
      $.flush()
      if (force || shift) {
        selection.toCaret()
      }
      else {
        selection.reset()
      }
    }

    function withIntent(fn: () => void) {
      fn()
      $.flush()
      caret.info.visualXIntent = caret.visual.x
    }

    // TODO:
    // - alt + arrow left/right (depends on ast)
    if (key.length === 1) {
      if (ctrl) {
        // ctrl + a = select all
        if (key === 'a') return selection.selectAll()

        // ctrl + / = toggle single comment line(s)
        // ctrl + shift + / = toggle double comment line(s)
        else if (key === '/' || key === '?') {
          return withHistoryDebounced(() =>
            withIntent(() => {
              if (shift) toggleDoubleComment()
              else toggleSingleComment()
            })
          )
        }

        // ctrl + ; = toggle block comment
        else if (key === ';') {
          return withHistoryDebounced(() =>
            withIntent(toggleBlockComment)
          )
        }

        // ctrl + shift + d =
        //   with no selection: duplicate line
        //   with selection: duplicate selection
        else if (shift && key === 'D') {
          return withHistoryDebounced(() => {
            if (selection.isActive) {
              duplicateSelection()
            }
            else {
              duplicateLine()
            }
          })
        }

        else if (key === 'z') return undo()
        else if (key === 'y') return redo()
      }

      // with selection: replace selection
      if (selection.isActive) {
        return withHistory(() => {
          selection.deleteText()
          handleKey(ev)
        })
      }

      // insert character
      withHistoryDebounced(() =>
        withIntent(() => {
          caret.insert(key)
          caret.moveByChars(+1)
        })
      )
    }
    else {
      // tab
      if (key === 'Tab') {
        withHistoryDebounced(() =>
          withIntent(() =>
            tabIndent(shift)
          )
        )
      }

      // backspace
      //   with selection: delete selection
      //   with no selection: delete character before caret
      else if (key === 'Backspace') {
        withHistoryDebounced(() => {
          if (selection.isActive) return selection.deleteText()
          if (ctrl) {
            withSelection(() => caret.moveByWord(-1), true)
            return selection.deleteText()
          }
          withIntent(caret.doBackspace)
        })
      }
      // delete
      //   with selection: delete selection
      //   with no selection: delete character after caret
      else if (key === 'Delete') {
        withHistoryDebounced(() => {
          if (selection.isActive) return selection.deleteText()
          if (ctrl) {
            withSelection(() => caret.moveByWord(+1), true)
            return selection.deleteText()
          }
          if (shift) {
            // delete line
            selection.selectLine()
            $.flush()
            selection.endIndex++
            $.flush()
            selection.deleteText()
            return
          }
          caret.doDelete()
        })
      }
      // home
      else if (key === 'Home') {
        withSelection(() => withIntent(caret.moveHome))
      }
      // end
      else if (key === 'End') {
        withSelection(() => withIntent(caret.moveEnd))
      }
      // arrow up/down
      else if (
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'PageUp' ||
        key === 'PageDown'
      ) {
        let dy = 0
        if (key === 'ArrowUp') dy = -1
        else if (key === 'ArrowDown') dy = +1
        else if (key === 'PageUp') dy = -dims.info.pageHeight
        else if (key === 'PageDown') dy = +dims.info.pageHeight
        if (alt) {
          // alt + arrow up/down: move lines/selection up/down
          return withHistoryDebounced(() =>
            moveLines(dy)
          )
        }
        withSelection(() =>
          caret.moveUpDown(dy)
        )
      }
      // arrow left
      else if (key === 'ArrowLeft') {
        withSelection(() =>
          withIntent(() => {
            if (ctrl) caret.moveByWord(-1)
            else caret.moveByChars(-1)
          })
        )
      }
      // arrow right
      else if (key === 'ArrowRight') {
        withSelection(() =>
          withIntent(() => {
            if (ctrl) caret.moveByWord(+1)
            else caret.moveByChars(+1)
          })
        )
      }
    }
  })

  return { handleKey }
}
