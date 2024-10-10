import { Sigui, type Signal } from 'sigui'
import { Anim } from '~/src/as/gfx/anim.ts'
import { Shapes } from '~/src/as/gfx/shapes.ts'
import { Sketch } from '~/src/as/gfx/sketch.ts'
import { Matrix, Rect } from '~/src/as/gfx/types.ts'
import { WebGL } from '~/src/as/gfx/webgl.ts'
import { state } from '~/src/state.ts'
import { Button } from '~/src/ui/Button.tsx'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { H2 } from '~/src/ui/Heading.tsx'

export function WebGLDemo({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const canvas = <Canvas width={width} height={height} /> as HTMLCanvasElement
  const matrix = Matrix()
  const view = Rect(0, 0, width, height)
  const webgl = WebGL(view, canvas, true)
  const sketch = Sketch(webgl.GL, view)
  const shapes = Shapes(view, matrix)
  const anim = Anim()
  sketch.scene.add(shapes)
  webgl.add($, sketch)
  anim.ticks.add(webgl.draw)

  function Box() {
    const boxRect = Rect(10, 10, 20, 20)
    const box = shapes.Box(boxRect)
    box.view.color = 0xffffff
    return box
  }

  $.fx(() => {
    $()
    const box = Box()
    box.view.w = 100
    box.view.h = 100
    box.view.color = Math.random() * 0xffffff
    let t = 0
    function tick() {
      box.view.x = Math.sin(t) * 100 + 100
      t += 0.1
      return true
    }
    anim.ticks.add(tick)
  })

  return <div>
    <div class="flex items-center justify-between">
      <H2>WebGL Demo</H2>
      <div class="flex items-center self-start gap-2">
        <span>Anim Mode:</span>
        <Button onclick={() => state.animCycle?.()}>{() => state.animMode}</Button>
      </div>
    </div>
    {canvas}
  </div>
}
