import { Sigui } from 'sigui'
import { dom } from 'utils'
import { Buffer } from '~/src/ui/editor/buffer.ts'
import type { Caret } from '~/src/ui/editor/caret.ts'

export function Kbd({ buffer, caret }: {
  buffer: Buffer
  caret: Caret
}) {
  using $ = Sigui()

  const el = <textarea
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

  const ignoredKeys = 'zycvxjrtn=+-'

  // read keyboard input
  $.fx(() => [
    // mobile
    dom.on(el, 'input', $.fn((ev: InputEvent) => {
      if (ev.data) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: ev.data }))
        el.value = ''
      }
    }) as any),

    // desktop
    dom.on(el, 'keydown', $.fn((ev: KeyboardEvent) => {
      if (ev.ctrlKey && ignoredKeys.includes(ev.key.toLowerCase())) return

      ev.preventDefault()

      caret.info.blinkReset++

      const { code, lines, linesVisual } = buffer.info

      const { key } = ev
      const ctrl = ev.ctrlKey || ev.metaKey
      const alt = ev.altKey
      const shift = ev.shiftKey

      // insert character
      if (key.length === 1) {
        const line = lines[caret.y]
        lines[caret.y] = line.slice(0, caret.x) + key + line.slice(caret.x)
        buffer.updateFromLines()
        caret.x++
        $.flush()
        caret.visualXIntent = caret.visual.x
      }
      else {
        // handle enter
        if (key === 'Enter') {
          const line = lines[caret.y]
          lines[caret.y] = line.slice(0, caret.x)
          lines.splice(caret.y + 1, 0, line.slice(caret.x))
          buffer.updateFromLines()
          caret.y++
          caret.x = 0
          $.flush()
          caret.visualXIntent = caret.visual.x
        }
        // handle backspace
        else if (key === 'Backspace') {
          caret.doBackspace()
        }
        // handle delete
        else if (key === 'Delete') {
          caret.doDelete()
        }
        // handle home
        else if (key === 'Home') {
          caret.moveHome()
        }
        // handle end
        else if (key === 'End') {
          caret.moveEnd()
        }
        // handle arrow keys
        else if (key === 'ArrowUp' || key === 'ArrowDown') {
          const newY = key === 'ArrowUp'
            ? caret.visual.y - 1
            : caret.visual.y + 1
          caret.moveUpDown(key === 'ArrowUp' ? -1 : +1)
        }
        else if (key === 'ArrowLeft') {
          if (ctrl) caret.moveByWord(-1)
          else caret.moveLeft()
        }
        else if (key === 'ArrowRight') {
          if (ctrl) caret.moveByWord(+1)
          else caret.moveRight()
        }
      }
    }))
  ])

  return el
}
