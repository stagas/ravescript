const PAGE_BYTES = 1024
export const MAX_BYTES = PAGE_BYTES * 32
export const MAX_GL_INSTANCES = MAX_BYTES >> 2

export enum VertOpts {
  Box /* */ = 0b001,
  Line /**/ = 0b010,
}

export enum ShapeOpts {
  // kind
  Box /*      */ = 0b0000_0000_0000_0001,
  Line /*     */ = 0b0000_0000_0000_0010,
  Wave /*     */ = 0b0000_0000_0000_0100,
  Notes /*    */ = 0b0000_0000_0000_1000,
  Params /*   */ = 0b0000_0000_0001_0000,
  // flags
  Collapse /* */ = 0b0000_0001_0000_0000,
  NoMargin /* */ = 0b0000_0010_0000_0000,
  Join /*     */ = 0b0000_0100_0000_0000,
  Cols /*     */ = 0b0000_1000_0000_0000,
  InfY /*     */ = 0b0001_0000_0000_0000,
  Shadow /*   */ = 0b0010_0000_0000_0000,
}

export const WAVE_MIPMAPS = 13

@unmanaged
export class Shape {
  opts: f32 = f32(ShapeOpts.Box)
}

@unmanaged
export class Box {
  opts: f32 = f32(ShapeOpts.Box)

  x: f32 = 0
  y: f32 = 0
  w: f32 = 0
  h: f32 = 0

  color: f32 = 0x0
  alpha: f32 = 1.0
}

@unmanaged
export class Notes {
  opts: f32 = f32(ShapeOpts.Notes)

  x: f32 = 0
  y: f32 = 0
  w: f32 = 0
  h: f32 = 0

  color: f32 = 0x0
  alpha: f32 = 1.0

  isFocused: f32 = 0
  notes$: f32 = 0
  hoveringNote$: f32 = 0
  hoverColor: f32 = 0

  min: f32 = 0
  max: f32 = 0
}

@unmanaged
export class Note {
  n: f32 = 0
  time: f32 = 0
  length: f32 = 0
  vel: f32 = 0
}

@unmanaged
export class Params {
  opts: f32 = f32(ShapeOpts.Params)

  x: f32 = 0
  y: f32 = 0
  w: f32 = 0
  h: f32 = 0

  color: f32 = 0x0
  alpha: f32 = 1.0

  params$: f32 = 0
  hoveringParam$: f32 = 0
  hoverColor: f32 = 0
}

@unmanaged
export class ParamValue {
  time: f32 = 0
  length: f32 = 0
  slope: f32 = 0
  amt: f32 = 0
}

@unmanaged
export class Line {
  opts: f32 = f32(ShapeOpts.Line)

  x0: f32 = 0
  y0: f32 = 0

  x1: f32 = 0
  y1: f32 = 0

  color: f32 = 0x0
  alpha: f32 = 1.0
  lw: f32 = 1
}

@unmanaged
export class Wave {
  opts: f32 = f32(ShapeOpts.Wave)

  x: f32 = 0
  y: f32 = 0
  w: f32 = 0
  h: f32 = 0

  color: f32 = 0x0
  alpha: f32 = 1.0
  lw: f32 = 1

  floats$: f32 = 0
  len: f32 = 0
  offset: f32 = 0
  coeff: f32 = 1
}

@unmanaged
export class Matrix {
  constructor() { }
  a: f64 = 0
  b: f64 = 0
  c: f64 = 0
  d: f64 = 0
  e: f64 = 0
  f: f64 = 0
}
