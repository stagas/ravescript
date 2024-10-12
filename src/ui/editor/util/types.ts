export type Point = ReturnType<typeof Point>

export function Point() {
  return { x: 0, y: 0 }
}

export type Linecol = ReturnType<typeof Linecol>

export function Linecol() {
  return { line: 0, col: 0 }
}

export function pointToLinecol(p: Point): Linecol {
  return { line: p.y, col: p.x }
}

export function linecolToPoint(linecol: Linecol): Point {
  return { x: linecol.col, y: linecol.line }
}
