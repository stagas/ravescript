import { type Shapes, fragment, MeshInfo, Rect, vertex, wasm } from 'gfx'
import { GL } from 'gl-util'
import { Sigui } from 'sigui'
import { MAX_GL_INSTANCES } from '~/as/assembly/gfx/sketch-shared.ts'

const DEBUG = false

export function SketchInfo(GL: GL, view: Rect) {
  using $ = Sigui()

  const { gl, attrib } = GL

  DEBUG && console.debug('[sketch-info] MAX_GL_INSTANCES:', MAX_GL_INSTANCES)

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
      view.w,
      view.h,
    )
  }

  const range = { begin: 0, end: 0, count: 0 }

  function writeGL(count: number) {
    range.end = range.count = count
    GL.writeAttribRange(a_vert, range)
    GL.writeAttribRange(a_style, range)
    // DEBUG && log('[sketch-info] write gl begin:', range.begin, 'end:', range.end, 'count:', range.count)
  }

  function finish() {
    wasm.flushSketch(+sketch$)
  }

  $.fx(() => {
    const { pr, w_pr, h_pr } = view
    $()
    info.use()
    gl.uniform1f(info.uniforms.u_pr, pr)
    gl.uniform2f(info.uniforms.u_screen, w_pr, h_pr)
  })

  return {
    info,
    range,
    writeGL,
    draw,
    finish,
  }
}
