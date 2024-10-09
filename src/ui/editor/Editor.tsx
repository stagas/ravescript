import { Sigui, type Signal } from 'sigui'
import { dom, drawText } from 'utils'
import { screen } from '~/src/screen.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { TextBuffer } from '~/src/ui/editor/text-buffer'
import {
  beginOfLine,
  parseWords,
  Point,
  WORD
} from '~/src/ui/editor/util/index.ts'

export function Editor({ code, width, height }: {
  code: Signal<string>
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const canvas = <Canvas width={width} height={height} /> as HTMLCanvasElement
  const textarea = <textarea
    spellcheck="false"
    autocorrect="off"
    autocapitalize="off"
    autocomplete="off"
    virtualkeyboardpolicy="manual"
    class="
      fixed opacity-50 w-[50px] h-[50px]
      pointer-events-none caret-transparent
      border-none outline-none
      resize-none p-0 whitespace-pre
      overflow-hidden z-50
    "
  /> as HTMLTextAreaElement

  const buffer = TextBuffer({ code })

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,

    code,
    get buffer() {
      const { code } = info
      $()
      buffer.info.code = code
      return buffer
    },

    /** Caret logical position. */
    caret: $(Point()),
    /** Caret index position. */
    caretIndex: 0,
    /** Caret visual position after word wrapping. */
    caretVisual: $(Point()),
    /** Caret x position intent. */
    caretVisualXIntent: 0,
    caretWidth: 2,
    caretBlink: false,
    caretVisible: true,

    charWidth: 1,
    charHeight: 1,

    lineHeight: 19,
  })

  info.caret.x = info.caretVisualXIntent = 1
  info.caret.y = 1

  const c = canvas.getContext('2d')!

  // wait for fonts to load
  document.fonts.ready.then(() => {
    info.c = c

    // measure char width and height
    const metrics = c.measureText('M')
    info.charWidth = metrics.width
    info.charHeight = Math.floor(metrics.fontBoundingBoxDescent - metrics.fontBoundingBoxAscent)
  })

  // initialize canvas context settings
  $.fx(() => {
    const { pr, c } = $.of(info)
    $()
    c.scale(pr, pr)
    c.textBaseline = 'top'
    c.textRendering = 'optimizeSpeed'
    c.miterLimit = 1.5
    c.font = '16px "Ubuntu Mono"'
  })

  // split code to lines
  // $.fx(() => {
  //   const { code } = info
  //   $()
  //   info.lines = code.split('\n')
  //   info.linesVisual = wordWrapText(info.lines, maxCharsPerLine)
  // })

  $.fx(() => {
    const { buffer, code, caret } = info
    const { x, y } = caret
    $()
    info.caretIndex = buffer.pointToIndex(caret)
  })

  // calculate caret visual point from logical.
  $.fx(() => {
    const { buffer, caretIndex } = info
    $()
    const { x, y } = buffer.indexToVisualPoint(caretIndex)
    info.caretVisual.x = x
    info.caretVisual.y = y
  })

  // draw everything
  $.fx(() => {
    const {
      c, width, height,
      buffer,
      code,
      caretVisual, caretWidth, caretVisible,
      charWidth, charHeight,
      lineHeight,
    } = $.of(info)

    const { x: cx, y: cy } = caretVisual

    $()

    // clear editor
    c.clearRect(0, 0, width, height)

    // draw text
    buffer.info.linesVisual.forEach((line, y) => {
      drawText(c, { x: 1, y: y * lineHeight }, line.text, '#888', 4, '#000')
    })

    // draw caret
    if (caretVisible) {
      c.fillStyle = '#fff'
      c.fillRect(
        cx * charWidth,
        cy * lineHeight + 1,
        caretWidth,
        charHeight
      )
    }
  })

  // blink caret
  $.fx(() => {
    const { caretBlink } = info
    $()
    if (!caretBlink) return
    const caretIv = setInterval(() => {
      info.caretVisible = !info.caretVisible
    }, 500)
    return () => {
      info.caretVisible = true
      clearInterval(caretIv)
    }
  })

  // focus textarea initially and on window focus or canvas pointerdown
  function focus() {
    textarea.focus()
  }
  requestAnimationFrame(focus)
  window.onfocus = canvas.onpointerup = () => {
    textarea.focus()
  }

  // read keyboard input
  $.fx(() => {
    textarea.focus()
    return [
      dom.on(textarea, 'keydown', $.fn((ev: KeyboardEvent) => {
        ev.preventDefault()

        const {
          buffer,
          caret, caretIndex, caretVisual, caretVisualXIntent,
        } = info

        const {
          code,
          lines, linesVisual
        } = buffer.info

        const { key } = ev
        const ctrl = ev.ctrlKey || ev.metaKey
        const alt = ev.altKey
        const shift = ev.shiftKey

        function moveCaretUpDown(newY: number) {
          if (newY >= 0 && newY <= linesVisual.length) {
            const { x, y } = buffer.visualPointToLogicalPoint({
              x: caretVisualXIntent,
              y: newY
            })
            caret.x = x
            caret.y = y
          }
        }

        function moveCaretLeft() {
          if (caret.x > 0) caret.x--
          else if (caret.y > 0) {
            caret.y--
            caret.x = lines[caret.y].length
          }
          $.flush()
          info.caretVisualXIntent = caretVisual.x
        }

        function moveCaretRight() {
          const line = lines[caret.y]
          if (caret.x < line.length) {
            caret.x++
          }
          else if (caret.y < lines.length - 1) {
            caret.y++
            caret.x = 0
          }
          $.flush()
          info.caretVisualXIntent = caretVisual.x
        }

        function moveCaretWord(dir: number) {
          const words = parseWords(WORD, code)
          let index = dir > 0 ? code.length : 0
          for (let i = dir > 0 ? 0 : words.length - 1; dir > 0 ? i < words.length : i >= 0; dir > 0 ? i++ : i--) {
            const word = words[i]
            if ((dir > 0 && word.index > caretIndex) || (dir < 0 && word.index < caretIndex)) {
              index = word.index
              break
            }
          }
          const p = buffer.indexToPoint(index)
          caret.x = p.x
          caret.y = p.y
          $.flush()
          info.caretVisualXIntent = caretVisual.x
        }

        // insert character
        if (key.length === 1) {
          const line = lines[caret.y]
          lines[caret.y] = line.slice(0, caret.x) + key + line.slice(caret.x)
          buffer.updateFromLines()
          caret.x++
          $.flush()
          info.caretVisualXIntent = caretVisual.x
        }
        else {
          // handle backspace
          if (key === 'Backspace') {
            // at greater than line length, remove char
            if (caret.x > 0) {
              const line = lines[caret.y]
              lines[caret.y] = line.slice(0, caret.x - 1) + line.slice(caret.x)
              buffer.updateFromLines()
              caret.x--
              $.flush()
              info.caretVisualXIntent = caretVisual.x
            }
            // at start of line, merge with previous line
            else if (caret.y > 0) {
              const line = lines[caret.y]
              caret.x = lines[caret.y - 1].length
              lines[caret.y - 1] += line
              lines.splice(caret.y, 1)
              buffer.updateFromLines()
              caret.y--
              $.flush()
              info.caretVisualXIntent = caretVisual.x
            }
          }
          // handle delete
          else if (key === 'Delete') {
            const line = lines[caret.y]
            if (caret.x < line.length) {
              lines[caret.y] = line.slice(0, caret.x) + line.slice(caret.x + 1)
              buffer.updateFromLines()
            }
          }
          // handle home
          else if (key === 'Home') {
            const bx = beginOfLine(linesVisual[caretVisual.y].text)
            const vx = bx === caretVisual.x ? 0 : bx
            const { x, y } = buffer.visualPointToLogicalPoint({ x: vx, y: caretVisual.y })
            caret.x = x
            caret.y = y
            $.flush()
            info.caretVisualXIntent = caretVisual.x
          }
          // handle end
          else if (key === 'End') {
            const { x, y } = buffer.visualPointToLogicalPoint({ x: linesVisual[caretVisual.y].text.length, y: caretVisual.y })
            caret.x = x
            caret.y = y
            $.flush()
            info.caretVisualXIntent = caretVisual.x
          }
          // handle enter
          else if (key === 'Enter') {
            const line = lines[caret.y]
            lines[caret.y] = line.slice(0, caret.x)
            lines.splice(caret.y + 1, 0, line.slice(caret.x))
            buffer.updateFromLines()
            caret.y++
            caret.x = 0
            $.flush()
            info.caretVisualXIntent = caretVisual.x
          }
          // handle arrow keys
          else if (key === 'ArrowUp' || key === 'ArrowDown') {
            const newY = key === 'ArrowUp'
              ? caretVisual.y - 1
              : caretVisual.y + 1
            moveCaretUpDown(newY)
          }
          else if (key === 'ArrowLeft') {
            if (ctrl) moveCaretWord(-1)
            else moveCaretLeft()
          }
          else if (key === 'ArrowRight') {
            if (ctrl) moveCaretWord(+1)
            else moveCaretRight()
          }
        }

      }))
    ]
  })

  const el = <div>
    {canvas}
    {textarea}
  </div>

  return { el, focus }
}
