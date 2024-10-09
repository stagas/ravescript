import type { Line, Point } from '~/src/ui/editor/util/index.ts'

export function indexToVisualPoint(index: number, linesVisual: Line[]): Point {
  let idx = 0

  for (let y = 0; y < linesVisual.length; y++) {
    const line = linesVisual[y]
    const lineLength = line.text.length

    if (idx + lineLength >= index) {
      // The caret is on this line
      const x = index - idx
      return { x, y }
    }

    idx += lineLength + (line.hasBreak ? 1 : 0) // +1 for newline character
  }

  // If we've gone through all lines and haven't found the position,
  // return the end of the last line
  return {
    x: linesVisual.at(-1).text.length,
    y: linesVisual.length - 1
  }
}
