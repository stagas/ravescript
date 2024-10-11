import { wasm, WasmMatrix, type Matrix, type Rect } from 'gfx'
import { Sigui } from 'sigui'
import { PointLike, Struct } from 'utils'
import { ShapeOpts, type Box, type Line, type Notes, type Params, type Wave } from '~/as/assembly/gfx/sketch-shared.ts'

export namespace Shape {
  // Box
  export const Box = Struct({
    opts: 'f32',

    x: 'f32',
    y: 'f32',
    w: 'f32',
    h: 'f32',

    color: 'f32',
    alpha: 'f32',
  })

  export type Box = [
    opts: ShapeOpts.Box,

    x: number,
    y: number,
    w: number,
    h: number,

    color: number,
    alpha: number,
  ]

  // Cols
  export const Cols = Struct({
    opts: 'f32',

    x: 'f32',
    y: 'f32',
    w: 'f32',
    h: 'f32',

    color: 'f32',
    alpha: 'f32',
  })

  export type Cols = [
    opts: ShapeOpts.Cols,

    x: number,
    y: number,
    w: number,
    h: number,

    color: number,
    alpha: number,
  ]

  // Notes
  export const Notes = Struct({
    opts: 'f32',

    x: 'f32',
    y: 'f32',
    w: 'f32',
    h: 'f32',

    color: 'f32',
    alpha: 'f32',

    isFocused: 'f32',
    notes$: 'f32',
    hoveringNote$: 'f32',
    hoverColor: 'f32',

    min: 'f32',
    max: 'f32',
  })

  export type Notes = [
    opts: ShapeOpts.Notes,

    x: number,
    y: number,
    w: number,
    h: number,

    color: number,
    alpha: number,

    isFocused: number,
    notes$: number,
    hoveringNote$: number,
    hoverColor: number,

    min: number,
    max: number,
  ]

  // Params
  export const Params = Struct({
    opts: 'f32',

    x: 'f32',
    y: 'f32',
    w: 'f32',
    h: 'f32',

    color: 'f32',
    alpha: 'f32',

    params$: 'f32',
    hoveringParam$: 'f32',
    hoverColor: 'f32',
  })

  export type Params = [
    opts: ShapeOpts.Params,

    x: number,
    y: number,
    w: number,
    h: number,

    color: number,
    alpha: number,

    params$: number,
    hoveringParam$: number,
    hoverColor: number,
  ]

  // Line
  export const Line = Struct({
    opts: 'f32',

    x0: 'f32',
    y0: 'f32',

    x1: 'f32',
    y1: 'f32',

    color: 'f32',
    alpha: 'f32',
    lw: 'f32',
  })

  export type Line = [
    opts: ShapeOpts.Line,

    x0: number,
    y0: number,

    x1: number,
    y1: number,

    color: number,
    alpha: number,
    lw: number,
  ]

  // Wave
  export const Wave = Struct({
    opts: 'f32',

    x: 'f32',
    y: 'f32',
    w: 'f32',
    h: 'f32',

    color: 'f32',
    alpha: 'f32',
    lw: 'f32',

    floats$: 'f32',
    len: 'f32',
    offset: 'f32',
    coeff: 'f32',
  })

  export type Wave = [
    opts: ShapeOpts.Wave,

    x: number,
    y: number,
    w: number,
    h: number,

    color: number,
    alpha: number,
    lw: number,

    floats$: number,
    len: number,
    offset: number,
    coeff: number,
  ]
}

export type Shapes = ReturnType<typeof Shapes>

export function Shapes(view: Rect, matrix: Matrix) {
  using $ = Sigui()

  type BoxView = ReturnType<typeof Box>
  type LineView = ReturnType<typeof Line>
  type WaveView = ReturnType<typeof Wave>

  type ShapeView = BoxView | LineView | WaveView

  const shapes = new Set<ShapeView>()
  const mat2d = WasmMatrix(view, matrix)

  const info = $({
    needUpdate: false,
    ptrs: wasm.alloc(Uint32Array, 1)
  })

  function clear() {
    for (const shape of [...shapes]) {
      shape.remove()
    }
  }

  function update() {
    let ptrs = info.ptrs

    const neededSize = shapes.size + 1 // +1 for ending null

    if (ptrs.length !== neededSize) {
      ptrs.free()
      ptrs = info.ptrs = wasm.alloc(Uint32Array, neededSize)
    }

    let i = 0
    for (const s of shapes) {
      if (s.visible) {
        ptrs[i++] = s.view.ptr
      }
    }
    ptrs[i++] = 0 // null means end

    info.needUpdate = false

    return ptrs
  }

  function Box(rect: Rect) {
    using $ = Sigui()

    const view = Shape.Box(wasm.memory.buffer, wasm.createBox()) satisfies Box

    view.opts = ShapeOpts.Box
    view.alpha = 1.0

    $.fx(() => {
      const { x, y, w, h } = rect
      $()
      view.x = x
      view.y = y
      view.w = w
      view.h = h
      info.needUpdate = true
    })

    const shape = $({
      visible: true,
      rect,
      view,
      remove() {
        $.dispose()
        shapes.delete(shape)
        info.needUpdate = true
      }
    })

    $.fx(() => {
      const { visible } = shape
      $()
      info.needUpdate = true
    })

    shapes.add(shape)

    return shape
  }

  function Notes(rect: Rect) {
    using $ = Sigui()

    const view = Shape.Notes(wasm.memory.buffer, wasm.createNotes()) satisfies Notes

    view.opts = ShapeOpts.Notes
    view.alpha = 1.0
    view.min = 0
    view.max = 1

    $.fx(() => {
      const { x, y, w, h } = rect
      $()
      view.x = x
      view.y = y
      view.w = w
      view.h = h
      info.needUpdate = true
    })

    const shape = $({
      visible: true,
      rect,
      view,
      remove() {
        $.dispose()
        shapes.delete(shape)
        info.needUpdate = true
      }
    })

    $.fx(() => {
      const { visible } = shape
      $()
      info.needUpdate = true
    })

    shapes.add(shape)

    return shape
  }

  function Params(rect: Rect) {
    using $ = Sigui()

    const view = Shape.Params(wasm.memory.buffer, wasm.createParams()) satisfies Params

    view.opts = ShapeOpts.Params
    view.alpha = 1.0

    $.fx(() => {
      const { x, y, w, h } = rect
      $()
      view.x = x
      view.y = y
      view.w = w
      view.h = h
      info.needUpdate = true
    })

    const shape = $({
      visible: true,
      rect,
      view,
      remove() {
        $.dispose()
        shapes.delete(shape)
        info.needUpdate = true
      }
    })

    $.fx(() => {
      const { visible } = shape
      $()
      info.needUpdate = true
    })

    shapes.add(shape)

    return shape
  }

  function Line(p0: PointLike, p1: PointLike) {
    using $ = Sigui()

    const view = Shape.Line(wasm.memory.buffer, wasm.createLine()) satisfies Line

    view.opts = ShapeOpts.Line
    view.alpha = 1.0
    view.lw = 1.0

    $.fx(() => {
      const { x, y } = p0
      $()
      view.x0 = x
      view.y0 = y
      info.needUpdate = true
    })

    $.fx(() => {
      const { x, y } = p1
      $()
      view.x1 = x
      view.y1 = y
      info.needUpdate = true
    })

    const shape = $({
      visible: true,
      p0,
      p1,
      view,
      remove() {
        $.dispose()
        shapes.delete(shape)
        info.needUpdate = true
      }
    })

    $.fx(() => {
      const { visible } = shape
      $()
      info.needUpdate = true
    })

    shapes.add(shape)

    return shape
  }

  function Wave(rect: Rect) {
    using $ = Sigui()

    const view = Shape.Wave(wasm.memory.buffer, wasm.createWave()) satisfies Wave

    view.opts = ShapeOpts.Wave
    view.alpha = 1.0
    view.lw = 1.0
    view.coeff = 1.0

    $.fx(() => {
      const { x, y, w, h } = rect
      $()
      view.x = x
      view.y = y
      view.w = w
      view.h = h
      info.needUpdate = true
    })

    const shape = $({
      visible: true,
      rect,
      view,
      remove() {
        $.dispose()
        shapes.delete(shape)
        info.needUpdate = true
      },
    })

    $.fx(() => {
      const { visible } = shape
      $()
      info.needUpdate = true
    })

    shapes.add(shape)

    return shape
  }

  return {
    info, mat2d, view, shapes, clear, update,
    Box, Line, Wave, Notes, Params,
  }
}
