import { Sigui, type Signal } from 'sigui'
import { Shapes } from '~/src/as/gfx/shapes.ts'
import { Sketch } from '~/src/as/gfx/sketch.ts'
import { Matrix, Rect } from '~/src/as/gfx/types.ts'
import { WebGL } from '~/src/as/gfx/webgl.ts'

export function Gfx({ width, height, canvas }: {
  width: Signal<number>
  height: Signal<number>
  canvas: HTMLCanvasElement
}) {
  using $ = Sigui()

  const matrix = Matrix()
  const view = Rect(0, 0, width, height)
  const webgl = WebGL(view, canvas, true)
  const sketch = Sketch(webgl.GL, view)
  webgl.add($, sketch)

  function createShapes() {
    return Shapes(view, matrix)
  }

  return {
    matrix,
    view,
    webgl,
    sketch,
    draw: webgl.draw,
    scene: sketch.scene,
    createShapes
  }
}
