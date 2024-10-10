import { $, type Signal } from 'sigui'
import { screen } from '~/src/screen.ts'

export type Matrix = ReturnType<typeof Matrix>

class MatrixInfo {
  a = 1
  b = 0
  c = 0
  d = 1
  e = 0
  f = 0
  _values?: [
    sx: number, cy: number,
    cx: number, sy: number,
    tx: number, ty: number,
  ]
  get values() {
    const { a, b, c, d, e, f } = this
    const o = (this._values ??= [
      1, 0, 0,
      1, 0, 0,
    ])
    o[0] = a
    o[1] = b
    o[2] = c
    o[3] = d
    o[4] = e
    o[5] = f
    return this._values
  }
}

export function Matrix(
  a: number | Signal<number> = 1,
  b: number | Signal<number> = 0,
  c: number | Signal<number> = 0,
  d: number | Signal<number> = 1,
  e: number | Signal<number> = 0,
  f: number | Signal<number> = 0,
) {
  return $(new MatrixInfo(), { a, b, c, d, e, f })
}

export type Rect = ReturnType<typeof Rect>

class RectInfo {
  pr = 0
  x = 0
  y = 0
  w = 0
  h = 0
  get x_pr() { return this.x * this.pr }
  get y_pr() { return this.y * this.pr }
  get w_pr() { return this.w * this.pr }
  get h_pr() { return this.h * this.pr }
  width = $.alias(this, 'w')
  height = $.alias(this, 'h')
}

export function Rect(
  x: number | Signal<number> = 0,
  y: number | Signal<number> = 0,
  w: number | Signal<number> = 0,
  h: number | Signal<number> = 0,
) {
  return $(new RectInfo(), {
    pr: screen.$.pr,
    x, y, w, h
  })
}
