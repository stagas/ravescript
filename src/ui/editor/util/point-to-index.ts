import type { Point } from '~/src/ui/editor/util/index.ts'

export function pointToIndex(point: Point, code: string): number {
  let { x, y } = point

  const lines = code.split('\n')

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
