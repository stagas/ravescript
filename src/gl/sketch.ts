import wasm from 'assembly-gfx'
import { GL } from 'gl-util'
import { Signal } from 'signal-jsx'
import { Matrix, Rect, RectLike } from 'std'
import { PointLike, Struct } from 'utils'
import { Box, Line, MAX_GL_INSTANCES, ShapeOpts, VertOpts, Wave, type Notes, Params } from '../../as/assembly/gfx/sketch-shared.ts'
import { MeshInfo } from '../mesh-info.ts'
import { log } from '../state.ts'
import { WasmMatrix } from '../util/wasm-matrix.ts'

const DEBUG = true

const hasBits = (varname: string, ...bits: number[]) => /*glsl*/
  `(int(${varname}) & (${bits.join(' | ')})) != 0`

const vertex = /*glsl*/`
#version 300 es
precision highp float;

in float a_quad;
in vec4 a_vert;
in vec4 a_style;

uniform float u_pr;
uniform vec2 u_screen;

out float v_opts;
out vec2 v_uv;
out vec2 v_size;
out vec2 v_color;

vec2 perp(vec2 v) {
  return vec2(-v.y, v.x);
}

void main() {
  vec2 a_color = a_style.xy;
  float a_opts = a_style.z;
  float a_lineWidth = a_style.w;

  vec2 pos = vec2(0.,0.);

  vec2 quad = vec2(
      mod(a_quad,  2.0),
    floor(a_quad / 2.0)
  );

  if (${hasBits('a_opts', VertOpts.Line)}) {
    vec2 a = a_vert.xy;
    vec2 b = a_vert.zw;
    vec2 v = b - a;

    float mag = length(v);
    float mag1 = 1.0 / mag;
    vec2 n = perp(v) * mag1;

    float lw = a_lineWidth;
    float lwh = lw * 0.5;

    mat3 transform = mat3(
      v.x,             v.y,             0.0,
      n.x * lw,        n.y * lw,        0.0,
      a.x - n.x * lwh, a.y - n.y * lwh, 1.0
    );

    pos = (transform * vec3(quad, 1.0)).xy * u_pr;
  }
  else {
    pos = (a_vert.xy + a_vert.zw * quad) * u_pr;
  }

  pos /= u_screen * 0.5;
  pos -= 1.0;
  pos.y *= -1.0;
  gl_Position = vec4(pos, 0.0, 1.0);

  v_color = a_color;
}
`

const fragment = /*glsl*/`
#version 300 es

precision highp float;

in vec2 v_color;
out vec4 fragColor;

vec3 intToRgb(int color) {
  int r = (color >> 16) & 0xFF;
  int g = (color >> 8) & 0xFF;
  int b = color & 0xFF;
  return vec3(float(r), float(g), float(b)) / 255.0;
}

void main() {
  vec3 color = intToRgb(int(v_color.x)).rgb;
  float alpha = v_color.y;
  fragColor = vec4(color, alpha);
}
`

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
  using $ = Signal()

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

  function Box(rect: RectLike) {
    using $ = Signal()

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

  function Notes(rect: RectLike) {
    using $ = Signal()

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

  function Params(rect: RectLike) {
    using $ = Signal()

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
    using $ = Signal()

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

  function Wave(rect: RectLike) {
    using $ = Signal()

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

function SketchInfo(GL: GL, view: Rect) {
  using $ = Signal()

  const { gl, attrib } = GL

  DEBUG && log('[sketch] MAX_GL_INSTANCES:', MAX_GL_INSTANCES)

  const info = MeshInfo(GL, {
    vertex,
    fragment,
    vao: {
      a_quad: [
        gl.ARRAY_BUFFER, attrib(1, new Float32Array([0, 1, 2, 3]))
      ],
      a_vert: [
        gl.ARRAY_BUFFER, attrib(4, wasm.alloc(Float32Array, MAX_GL_INSTANCES * 4), 1),
        gl.DYNAMIC_DRAW
      ],
      a_style: [
        gl.ARRAY_BUFFER, attrib(4, wasm.alloc(Float32Array, MAX_GL_INSTANCES * 4), 1),
        gl.DYNAMIC_DRAW
      ],
    }
  })

  const {
    a_vert,
    a_style,
  } = info.attribs

  const sketch$ = wasm.createSketch(
    a_vert.ptr,
    a_style.ptr,
  )

  function draw(shapes: Shapes) {
    if (shapes.info.needUpdate) shapes.update()
    const { mat2d, view, info: { ptrs } } = shapes
    return wasm.draw(
      +sketch$,
      ptrs.ptr,
      mat2d.byteOffset,
      view.width,
      view.height,
    )
  }

  const range = { begin: 0, end: 0, count: 0 }

  function writeGL(count: number) {
    range.end = range.count = count
    GL.writeAttribRange(a_vert, range)
    GL.writeAttribRange(a_style, range)
    // DEBUG && log('[sketch] write gl begin:', range.begin, 'end:', range.end, 'count:', range.count)
  }

  function finish() {
    wasm.maybeFlushSketch(+sketch$)
  }

  $.fx(() => {
    const { pr, w_pr, h_pr } = view
    $()
    info.use()
    gl.uniform1f(info.uniforms.u_pr, pr)
    gl.uniform2f(info.uniforms.u_screen, w_pr, h_pr)
  })

  $.fx(() => () => {
    sketch = null
  })

  return {
    info,
    range,
    writeGL,
    draw,
    finish,
  }
}

let sketch: ReturnType<typeof SketchInfo> | null

export type Sketch = ReturnType<typeof Sketch>

export function Sketch(GL: GL, view: Rect) {
  using $ = Signal()

  const sketch = SketchInfo(GL, view)

  const { gl } = GL
  const { info, finish, writeGL, draw: sketchDraw } = sketch
  const { use } = info

  function flush(count: number) {
    DEBUG && log('[sketch] draw', count)
    writeGL(count)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
  }

  const scene = new Set<Shapes>()

  function draw() {
    use()
    wasm.setFlushSketchFn(flush)
    // DEBUG && console.log('[sketch] draw', scene)
    for (const shapes of scene) {
      sketchDraw(shapes)
    }
    finish()
  }

  return { draw, scene, info, view }
}
