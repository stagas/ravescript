import { GL } from 'gl-util'
import type { Shapes } from '~/src/as/gfx/shapes.ts'
import { SketchInfo } from '~/src/as/gfx/sketch-info.ts'
import { type Rect } from '~/src/as/gfx/types.ts'
import wasm from '~/src/as/gfx/wasm.ts'

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
