import { Anim, Gfx, Matrix, Rect } from 'gfx'
import { Sigui, type Signal } from 'sigui'
import { AnimMode } from '~/src/comp/AnimMode.tsx'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { H2 } from '~/src/ui/Heading.tsx'

export function WebGLDemo({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const canvas = <Canvas width={width} height={height} /> as HTMLCanvasElement

  const gfx = Gfx({ canvas })

  const anim = Anim()
  // anim.ticks.add(gfx.draw)

  {
    const view = Rect(0, 0, 500, 500)
    const matrix = Matrix()
    const ctx = gfx.createContext(view, matrix)
    const shapes = ctx.createShapes()
    ctx.sketch.scene.add(shapes)
    anim.ticks.add(ctx.meshes.draw)

    function Box() {
      const boxRect = Rect(10, 10, 20, 20)
      const box = shapes.Box(boxRect)
      box.view.color = 0xffffff
      return box
    }

    $.fx(() => {
      $()
      const box = Box()
      box.view.color = Math.random() * 0xffffff
      let t = 0
      function tick() {
        box.view.x = Math.sin(t) * 100 + 100
        t += 0.1
        return true
      }
      anim.ticks.add(tick)
    })
  }

  {
    const view = Rect(0, 30, 500, 500)
    const matrix = Matrix()
    const ctx = gfx.createContext(view, matrix)
    const shapes = ctx.createShapes()
    ctx.sketch.scene.add(shapes)
    anim.ticks.add(ctx.meshes.draw)

    function Box() {
      const boxRect = Rect(10, 30, 20, 20)
      const box = shapes.Box(boxRect)
      // box.view.opts |=
      box.view.color = 0xffffff
      return box
    }

    $.fx(() => {
      $()
      const box = Box()
      box.view.color = Math.random() * 0xffffff
      let t = 0
      function tick() {
        box.view.x = Math.sin(t) * 100 + 100
        t += 0.1
        return true
      }
      anim.ticks.add(tick)
    })
  }

  return <div>
    <div class="flex items-center justify-between">
      <H2>WebGL Demo</H2>
      <AnimMode anim={anim} />
    </div>
    {canvas}
  </div>
}
