import type { Point } from '~/src/ui/editor/util/index.ts'

export function indexToPoint(index: number, lines: string[]): Point {
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
