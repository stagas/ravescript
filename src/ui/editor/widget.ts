import { Sigui, type Signal } from 'sigui'
import { Gfx } from '~/src/as/gfx/gfx.ts'
import { Rect } from '~/src/as/gfx/types.ts'
import type { Token } from '~/src/lang/tokenize.ts'
import type { Point } from '~/src/ui/editor/util/types.ts'

function Bounds(): Token.Bounds {
  using $ = Sigui()
  return $({ line: 0, col: 0, right: 0, bottom: 0, index: 0, length: 0 })
}

interface WidgetLineInfo {
  deco: number
  subs: number
  mark: number
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

  const types = ['deco', 'subs', 'mark'] as const

  function widgetDraw(widget: Widget) {
    widget.draw(c)
  }

  const lines = new Map<number, WidgetLineInfo>()

  const heights = {
    deco: 40,
    subs: 20,
    mark: 16,
  } as const

  function update() {
    lines.clear()
    types.forEach(type => {
      widgets[type].forEach(w => {
        for (let y = w.bounds.line; y <= w.bounds.bottom; y++) {
          let line = lines.get(y)
          if (!line) lines.set(y, line = { deco: 0, subs: 0, mark: 0 })
          line[type] = heights[type]
        }
      })
    })
  }

  function draw() {
    update()
    deco.forEach(widgetDraw)
    subs.forEach(widgetDraw)
    mark.forEach(widgetDraw)
    gfx.draw()
  }

  const widgets = { gfx, update, draw, deco, subs, mark, heights, lines }

  return widgets
}

export type Widget = ReturnType<typeof Widget>

export function Widget() {
  const rect = Rect()
  const bounds = Bounds()
  function draw(c: CanvasRenderingContext2D) { }
  return { rect, bounds, draw }
}