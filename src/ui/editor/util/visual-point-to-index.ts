import type { Line, Point } from '~/src/ui/editor/util/index.ts'

export function visualPointToIndex(
  point: Point,
  linesVisual: Line[]
): number {
  const { x, y } = point

  let index = 0

  // Sum up the lengths of all previous lines
  for (let i = 0; i < y; i++) {
    const line = linesVisual[i]
    index += line.text.length + (line.hasBreak ? 1 : 0) // +1 for newline character
  }

  // Add the x position on the current line
  const line = linesVisual[y]
  index += Math.min(x, line.text.length + (line.hasBreak ? 1 : 0))

  return index
}
