import { Sigui, type Signal } from 'sigui'
import type { Point } from '~/src/ui/editor/util/index.ts'

export interface TextLine {
  text: string
  br?: true
}

export function TextBuffer({ code }: { code: Signal<string> }) {
  using $ = Sigui()

  const info = $({
    code,
    maxWidth: 10,
    get lines() {
      return info.code.split('\n')
    },
    get linesVisual(): TextLine[] {
      const { code, maxWidth } = info
      $()

      const wrapped: TextLine[] = []

      let line = ''
      let word = ''
      let x = 0

      function push() {
        const joined = line + word
        if (joined.length > maxWidth) {
          wrapped.push({ text: line })
          if (word.length) wrapped.push({ text: word })
        }
        else {
          wrapped.push({ text: joined })
        }
        word = ''
        line = ''
        x = 0
      }

      for (let i = 0; i < code.length; i++) {
        const c = code[i]
        if (c === '\n') {
          wrapped.push({ text: line + word, br: true })
          word = ''
          line = ''
          x = 0
        }
        else if (c === ' ') {
          if (x >= maxWidth) {
            push()
            word = c
          }
          else {
            line += word + c
            word = ''
          }
        }
        else {
          if (word.length === maxWidth) {
            wrapped.push({ text: word })
            word = ''
            x = 0
          }
          word += c
          if (line.length && (line + word).length >= maxWidth) {
            wrapped.push({ text: line })
            line = ''
            x = 0
          }
        }
        x++
      }

      if (line.length || word.length || word.length === code.length) {
        push()
      }

      return wrapped
    }
  })

  function indexToPoint(index: number): Point {
    const { lines } = info

    let currentIndex = 0

    for (let y = 0; y < lines.length; y++) {
      const lineLength = lines[y].length + 1 // +1 for the newline character

      if (currentIndex + lineLength > index) {
        // The point is on this line
        const x = index - currentIndex
        return { x, y }
      }

      currentIndex += lineLength
    }

    // If we've reached here, the index is at the very end of the text
    return {
      x: lines.at(-1).length,
      y: lines.length - 1
    }
  }

  function indexToVisualPoint(index: number): Point {
    const { linesVisual } = info

    let idx = 0

    for (let y = 0; y < linesVisual.length; y++) {
      const line = linesVisual[y]
      const lineLength = line.text.length + (line.br ? 1 : 0)

      if (idx + lineLength > index) {
        // The caret is on this line
        const x = index - idx
        return { x, y }
      }

      idx += lineLength  // +1 for newline character
    }

    // If we've gone through all lines and haven't found the position,
    // return the end of the last line
    const line = linesVisual.at(-1)
    return {
      x: line.br ? 0 : line.text.length,
      y: linesVisual.length - (line.br ? 0 : 1)
    }
  }

  function pointToIndex(point: Point): number {
    const { lines } = info
    let { x, y } = point

    if (y > lines.length - 1) {
      y = lines.length - 1
      x = lines[y].length
    }
    else {
      x = Math.min(x, lines[y].length)
    }

    const before = lines
      .slice(0, y)
      .reduce((sum, line) =>
        sum + line.length + 1,
        0
      )

    const index = before + x

    return index
  }

  function visualPointToIndex(point: Point): number {
    const { linesVisual } = info
    let { x, y } = point

    if (y >= linesVisual.length) return info.code.length

    let index = 0

    // sum up the lengths of all previous lines
    for (let i = 0; i < y; i++) {
      const line = linesVisual[i]
      index += line.text.length + (line.br ? 1 : 0)
    }

    // add the x position of the current line
    const line = linesVisual[y]
    index += Math.min(x, line.text.length)

    return index
  }

  function visualPointToLogicalPoint(point: Point): Point {
    const index = visualPointToIndex(point)
    return indexToPoint(index)
  }

  function updateFromLines() {
    info.code = info.lines.join('\n')
  }

  return {
    info,
    updateFromLines,
    indexToPoint,
    indexToVisualPoint,
    pointToIndex,
    visualPointToIndex,
    visualPointToLogicalPoint
  }
}
