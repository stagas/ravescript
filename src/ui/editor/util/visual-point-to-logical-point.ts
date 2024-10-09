import type { Point } from 'utils'
import { indexToPoint, visualPointToIndex, type Line } from '~/src/ui/editor/util/index.ts'

export function visualPointToLogicalPoint(
  point: Point,
  lines: string[],
  linesVisual: Line[]
): Point {
  const index = visualPointToIndex(point, linesVisual)
  return indexToPoint(index, lines)
}
