import { Sigui } from 'sigui'
import type { Dims } from '~/src/ui/editor/dims.ts'
import type { Misc } from '~/src/ui/editor/misc.ts'
import type { Buffer } from '~/src/ui/editor/buffer.ts'
import { beginOfLine } from '~/src/ui/editor/util/index.ts'
import { Point } from '~/src/ui/editor/util/types.ts'

export type Caret = ReturnType<typeof Caret>

export function Caret({ buffer, dims, misc }: {
  buffer: Buffer,
  dims: Dims,
  misc: Misc,
}) {
  using $ = Sigui()

  const info = $({
    x: 0,
    y: 0,
    index: 0,
    visual: $(Point()),
    visualXIntent: 0,
    blinkReset: 0,
    isBlink: false,
    isVisible: false,
  })

  const caret = info

  $.fx(() => {
    const { code } = buffer.info
    const { x, y } = caret
    $()
    caret.index = buffer.pointToIndex(caret)
  })

  // calculate caret visual point from logical.
  $.fx(() => {
    const { index } = caret
    $()
    const { x, y } = buffer.indexToVisualPoint(index)
    caret.visual.x = x
    caret.visual.y = y
  })

  // blink caret
  $.fx(() => {
    const { isFocus } = misc.info
    const { isBlink, blinkReset } = caret
    $()
    if (!isFocus || !isBlink) return
    caret.isVisible = true
    const caretIv = setInterval(() => {
      caret.isVisible = !caret.isVisible
    }, 500)
    return () => {
      caret.isVisible = true
      clearInterval(caretIv)
    }
  })

  function doBackspace() {
    const { lines } = buffer.info
    // at greater than line length, remove char
    if (caret.x > 0) {
      const line = lines[caret.y]
      lines[caret.y] = line.slice(0, caret.x - 1) + line.slice(caret.x)
      buffer.updateFromLines()
      caret.x--
      $.flush()
      caret.visualXIntent = caret.visual.x
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
      caret.visualXIntent = caret.visual.x
    }
  }

  function doDelete() {
    const { lines } = buffer.info
    const line = lines[caret.y]
    if (caret.x < line.length) {
      lines[caret.y] = line.slice(0, caret.x) + line.slice(caret.x + 1)
      buffer.updateFromLines()
    }
  }

  function moveHome() {
    const { linesVisual } = buffer.info
    const bx = beginOfLine(linesVisual[caret.visual.y]?.text ?? '')
    const vx = bx === caret.visual.x ? 0 : bx
    const { x, y } = buffer.visualPointToLogicalPoint({
      x: vx,
      y: caret.visual.y
    })
    caret.x = x
    caret.y = y
    $.flush()
    caret.visualXIntent = caret.visual.x
  }

  function moveEnd() {
    const { linesVisual } = buffer.info
    const { x, y } = buffer.visualPointToLogicalPoint({
      x: linesVisual[caret.visual.y]?.text.length ?? 0,
      y: caret.visual.y
    })
    caret.x = x
    caret.y = y
    $.flush()
    caret.visualXIntent = caret.visual.x
  }

  function moveUpDown(dy: number) {
    const { linesVisual } = buffer.info
    const newY = caret.visual.y + dy
    if (newY >= 0 && newY <= linesVisual.length) {
      const { x, y } = buffer.visualPointToLogicalPoint({
        x: caret.visualXIntent,
        y: newY
      })
      caret.x = x
      caret.y = y
    }
  }

  function moveLeft() {
    const { lines } = buffer.info
    if (caret.x > 0) caret.x--
    else if (caret.y > 0) {
      caret.y--
      caret.x = lines[caret.y].length
    }
    $.flush()
    caret.visualXIntent = caret.visual.x
  }

  function moveRight() {
    const { lines } = buffer.info
    const line = lines[caret.y]
    if (caret.x < line.length) {
      caret.x++
    }
    else if (caret.y < lines.length - 1) {
      caret.y++
      caret.x = 0
    }
    $.flush()
    caret.visualXIntent = caret.visual.x
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
    const p = buffer.indexToPoint(index)
    caret.x = p.x
    caret.y = p.y
    $.flush()
    caret.visualXIntent = caret.visual.x
  }

  function draw(c: CanvasRenderingContext2D, point: Point) {
    const { isVisible } = caret
    if (!isVisible) return

    const { caretWidth, charHeight } = dims.info

    c.fillStyle = '#fff'
    c.fillRect(
      point.x,
      point.y + .5,
      caretWidth,
      charHeight
    )
  }

  return $({
    info,
    x: caret.$.x,
    y: caret.$.y,
    index: caret.$.index,
    visual: caret.$.visual,
    visualXIntent: caret.$.visualXIntent,
    doBackspace,
    doDelete,
    moveHome,
    moveEnd,
    moveUpDown,
    moveLeft,
    moveRight,
    moveByWord,
    draw,
  })
}
