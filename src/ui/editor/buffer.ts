import { Sigui, type Signal } from 'sigui'
import type { Source, Token } from '~/src/lang/tokenize.ts'
import { parseWords, TOKEN, WORD, type Point } from 'editor'

export interface Line {
  text: string
  br?: true
}

export interface WordWrapProcessor {
  pre(s: string): string
  post(s: string): string
}
export type Buffer = ReturnType<typeof Buffer>

function identity(x: any) { return x }

export function Buffer({ code, tokenize, wordWrapProcessor = { pre: identity, post: identity } }: {
  code: Signal<string>,
  tokenize: (source: Source) => Generator<Token, void, unknown>
  wordWrapProcessor?: WordWrapProcessor
}) {
  using $ = Sigui()

  const info = $({
    maxColumns: 10,
    code,
    lines: [] as string[],
    get length() {
      return info.code.length
    },
    get codeVisual() {
      return info.linesVisual.map(line => line.text).join('\n')
    },
    get source() {
      return { code: info.codeVisual }
    },
    get tokens() {
      return [...tokenize(info.source)]
    },
    get words() {
      return parseWords(WORD, info.code)
    },
    get linesVisual(): Line[] {
      const { code, maxColumns } = info
      $()
      return wordWrap()
    }
  })

  // split code into lines
  $.fx(() => {
    const { code } = info
    $()
    info.lines = code.split('\n')
  })

  // join lines into code
  $.fx(() => {
    const { lines } = info
    $()
    info.code = lines.join('\n')
  })

  function wordWrap(): Line[] {
    let { code, maxColumns } = info

    const wrapped: Line[] = []
    let line = ''
    let word = ''
    let x = 0

    code = wordWrapProcessor.pre(code)

    function push() {
      const joined = line + word
      if (joined.length > maxColumns) {
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
        if (x >= maxColumns) {
          push()
          word = c
        }
        else {
          line += word + c
          word = ''
        }
      }
      else {
        if (word.length >= maxColumns) {
          wrapped.push({ text: word })
          word = ''
          x = 0
        }
        word += c
        if (line.length && (line + word).length >= maxColumns) {
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

    return wrapped.map(line => {
      line.text = wordWrapProcessor.post(line.text)
      return line
    })
  }

  function indexToLogicalPoint(index: number): Point {
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
        const x = index - idx
        return { x, y }
      }

      idx += lineLength
    }

    // if we've gone through all lines and haven't found the position,
    // return the end of the last line
    const line = linesVisual.at(-1)
    return {
      x: line.br ? 0 : line.text.length,
      y: linesVisual.length - (line.br ? 0 : 1)
    }
  }

  function logicalPointToIndex(point: Point): number {
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

    let line = linesVisual[y]
    x = Math.min(
      x,
      line.text.length
      - (line.br || y === linesVisual.length - 1
        ? 0
        : 1
      )
    )

    let index = 0

    // sum up the lengths of all previous lines
    for (let i = 0; i < y; i++) {
      const line = linesVisual[i]
      index += line.text.length + (line.br ? 1 : 0)
    }

    // add the x position of the current line
    index += Math.min(x, line.text.length)

    return index
  }

  function visualPointToLogicalPoint(point: Point): Point {
    const index = visualPointToIndex(point)
    return indexToLogicalPoint(index)
  }

  function wordUnderVisualPoint(point: Point): RegExpExecArray | undefined {
    const { x, y } = point
    const words = parseWords(TOKEN, info.linesVisual[y].text)
    for (let i = 0, word: RegExpExecArray, next: any; i < words.length; i++) {
      word = words[i]
      next = i < words.length - 1 ? words[i + 1] : { index: Infinity }
      if (x >= word.index && x < next.index) {
        return word
      }
    }
  }

  return $({
    info,
    code,
    length: info.$.length,
    lines: info.$.lines,
    linesVisual: info.$.linesVisual,
    indexToLogicalPoint,
    indexToVisualPoint,
    logicalPointToIndex,
    visualPointToIndex,
    visualPointToLogicalPoint,
    wordUnderVisualPoint,
  })
}
