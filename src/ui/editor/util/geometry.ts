import type { Point, Rect } from 'editor'

export function isPointInRect(p: Point, r: Rect) {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h
}
