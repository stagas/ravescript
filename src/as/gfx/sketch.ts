import { SketchInfo, wasm, type Rect, type Shapes } from 'gfx'
import { GL } from 'gl-util'

const DEBUG = true

export type Sketch = ReturnType<typeof Sketch>

export function Sketch(GL: GL, view: Rect) {
  const sketch = SketchInfo(GL, view)
  const scene = new Set<Shapes>()

  const { gl } = GL
  const { info, finish, writeGL, draw: sketchDraw } = sketch
  const { use } = info

  function flush(count: number) {
    // DEBUG && console.log('[sketch] draw', count)
    writeGL(count)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
  }

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
