import { Matrix, Meshes, Rect, Shapes, Sketch } from 'gfx'
import { initGL } from 'gl-util'
import { Sigui } from 'sigui'

const DEBUG = true

export function Gfx({ canvas }: {
  canvas: HTMLCanvasElement
}) {
  using $ = Sigui()

  const GL = initGL(canvas, {
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  })

  function createContext(view: Rect, matrix: Matrix) {
    const meshes = Meshes(GL, view)
    const sketch = Sketch(GL, view)
    meshes.add($, sketch)

    function createShapes() {
      return Shapes(view, matrix)
    }

    return { meshes, sketch, createShapes }
  }

  $.fx(() => () => {
    DEBUG && console.debug('[webgl] dispose')
    GL.reset()
  })

  return {
    createContext
  }
}
