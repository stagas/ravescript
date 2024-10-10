import { Sigui, type Signal } from 'sigui'
import { cn } from '~/lib/cn.ts'
import { Anim } from '~/src/as/gfx/anim.ts'
import { Gfx } from '~/src/as/gfx/gfx.ts'
import { Rect } from '~/src/as/gfx/types.ts'
import { AnimMode } from '~/src/comp/AnimMode.tsx'
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

  const gfx = Gfx({ width, height, canvas })

  const anim = Anim()
  anim.ticks.add(gfx.draw)

  const shapes = gfx.createShapes()
  gfx.scene.add(shapes)

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
      <AnimMode anim={anim} />
    </div>
    {canvas}
  </div>
}
