import { Sigui, type Signal } from 'sigui'
import { Gfx } from '~/src/as/gfx/gfx.ts'
import type { Token } from '~/src/lang/tokenize.ts'

function Bounds(): Token.Bounds {
  using $ = Sigui()
  return $({ line: 0, col: 0, right: 0, bottom: 0, index: 0, length: 0 })
}

export type Widgets = ReturnType<typeof Widgets>

export function Widgets({ width, height, c, glCanvas }: {
  width: Signal<number>
  height: Signal<number>
  c: CanvasRenderingContext2D
  glCanvas: HTMLCanvasElement
}) {
  const gfx = Gfx({ width, height, canvas: glCanvas })

  const deco = new Set<Widget>()
  const subs = new Set<Widget>()
  const mark = new Set<Widget>()

  function widgetDraw(widget: Widget) {
    widget.draw(c)
  }

  function draw() {
    deco.forEach(widgetDraw)
    subs.forEach(widgetDraw)
    mark.forEach(widgetDraw)
    gfx.draw()
  }

  return { gfx, draw, deco, subs, mark }
}

export type Widget = ReturnType<typeof Widget>

export function Widget() {
  using $ = Sigui()

  const bounds = Bounds()

  const info = $({})

  function draw(c?: CanvasRenderingContext2D) { }

  return { info, bounds, draw }
}
