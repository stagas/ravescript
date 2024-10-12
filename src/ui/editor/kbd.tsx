import { Buffer, type Caret, type History, type Selection } from 'editor'
import { Sigui } from 'sigui'
import { dom } from 'utils'

export function Kbd({ selection, buffer, caret, history }: {
  selection: Selection
  buffer: Buffer
  caret: Caret
  history: History
}) {
  using $ = Sigui()

  const textarea = <textarea
    spellcheck="false"
    autocorrect="off"
    autocapitalize="off"
    autocomplete="off"
    virtualkeyboardpolicy="auto"
    class="
      fixed right-0 top-0 opacity-0 w-[50px] h-[50px]
      pointer-events-none caret-transparent
      border-none outline-none
      resize-none p-0 whitespace-pre
      overflow-hidden z-50
    "
  /> as HTMLTextAreaElement

  const ignoredKeys = 'cvxjrtn=+-'

  const { withHistory, withHistoryDebounced, undo, redo } = history

  const handleKey = $.fn((ev: KeyboardEvent) => {
    if (ev.ctrlKey && ignoredKeys.includes(ev.key.toLowerCase())) return

    ev.preventDefault()

    caret.info.blinkReset++

    let { key } = ev
    const ctrl = ev.ctrlKey || ev.metaKey
    const alt = ev.altKey
    let shift = ev.shiftKey

    if (key === 'Enter') key = '\n'

    function withSelection(fn: () => void, force = false) {
      if (!shift && selection.isActive) selection.clear()
      if (force || (shift && !selection.isActive)) {
        selection.begin()
      }
      fn()
      $.flush()
      if (force || shift) {
        selection.finish()
      }
    }

    function withIntent(fn: () => void) {
      fn()
      $.flush()
      caret.info.visualXIntent = caret.visual.x
    }

    if (key.length === 1) {
      if (ctrl) {
        // ctrl + a = select all
        if (key === 'a') return selection.selectAll()

        // ctrl + shift + d =
        //   with no selection: duplicate line
        //   with selection: duplicate selection
        else if (shift && key === 'D') {
          return withHistoryDebounced(() => {
            const { index } = caret
            if (selection.isActive) {
              const { length } = selection.text
              caret.insert(selection.text)
              caret.index += length
              selection.info.startIndex += length
              selection.info.endIndex += length
            }
            else {
              caret.index = buffer.logicalPointToIndex({ x: 0, y: caret.y })
              $.flush()
              const line = buffer.info.lines[caret.y] + '\n'
              caret.insert(line)
              caret.index = index + line.length
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
          caret.moveRight()
        })
      )
    }
    else {
      // backspace
      //   with selection: delete selection
      //   with no selection: delete character before caret
      if (key === 'Backspace') {
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
      else if (key === 'ArrowUp' || key === 'ArrowDown') {
        withSelection(() =>
          caret.moveUpDown(key === 'ArrowUp' ? -1 : +1)
        )
      }
      // arrow left
      else if (key === 'ArrowLeft') {
        withSelection(() =>
          withIntent(() => {
            if (ctrl) caret.moveByWord(-1)
            else caret.moveLeft()
          })
        )
      }
      // arrow right
      else if (key === 'ArrowRight') {
        withSelection(() =>
          withIntent(() => {
            if (ctrl) caret.moveByWord(+1)
            else caret.moveRight()
          })
        )
      }
    }
  })

  // read keyboard input
  $.fx(() => [
    // mobile
    dom.on(textarea, 'input', $.fn((ev: Event) => {
      const inputEvent = ev as InputEvent
      if (inputEvent.data) {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: inputEvent.data }))
        textarea.value = ''
      }
    })),

    // desktop
    dom.on(textarea, 'keydown', handleKey),

    // clipboard
    dom.on(textarea, 'paste', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      const text = ev.clipboardData?.getData('text/plain')
      if (text) {
        withHistory(() => {
          selection.begin()
          caret.insert(text)
          caret.index += text.length
          $.flush()
          selection.finish()
        })
      }
    })),

    dom.on(textarea, 'copy', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      ev.clipboardData?.setData('text/plain', selection.text)
    })),

    dom.on(textarea, 'cut', $.fn((ev: ClipboardEvent) => {
      ev.preventDefault()
      ev.clipboardData?.setData('text/plain', selection.text)
      withHistory(selection.deleteText)
    })),
  ])

  return textarea
}
