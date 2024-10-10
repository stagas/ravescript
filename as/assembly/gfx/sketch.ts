import { Floats } from '../types'
import { flushSketch } from './env'
import { MAX_GL_INSTANCES, VertOpts } from './sketch-shared'

/**
 * Sketch holds the data that is sent to WebGL.
 */
export class Sketch {
  ptr: u32 = 0
  a_vert: Floats
  a_style: Floats
  constructor(
    public a_vert$: usize,
    public a_style$: usize,
  ) {
    this.a_vert = changetype<Floats>(a_vert$)
    this.a_style = changetype<Floats>(a_style$)
  }
  @inline
  flush(): void {
    flushSketch(this.ptr)
    this.ptr = 0
  }
  @inline
  advance(): void {
    if (++this.ptr === MAX_GL_INSTANCES) {
      this.flush()
    }
  }
  @inline
  drawBox(
    x: f32, y: f32, w: f32, h: f32,
    color: f32,
    alpha: f32,
  ): void {
    const ptr = this.ptr
    const ptr4 = (ptr * 4) << 2
    store4(this.a_vert$ + ptr4, x, y, w, h)
    store4(this.a_style$ + ptr4, color, alpha, f32(VertOpts.Box), 1.0)
    this.advance()
  }
  @inline
  drawLine(
    x0: f32, y0: f32,
    x1: f32, y1: f32,
    color: f32,
    alpha: f32,
    lineWidth: f32
  ): void {
    const ptr = this.ptr
    const ptr4 = (ptr * 4) << 2
    store4(this.a_vert$ + ptr4, x0, y0, x1, y1)
    store4(this.a_style$ + ptr4, color, alpha, f32(VertOpts.Line), lineWidth)
    this.advance()
  }
}

// @ts-ignore
@inline
function store4(ptr: usize, x: f32, y: f32, z: f32, w: f32): void {
  const v = f32x4(x, y, z, w)
  v128.store(ptr, v)
}

// @ts-ignore
@inline
function store2(ptr: usize, x: f32, y: f32): void {
  f32.store(ptr, x)
  f32.store(ptr, y, 4)
}

