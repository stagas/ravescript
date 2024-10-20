import { hexToInt, Widget } from 'editor'
import type { Shapes } from 'gfx'
import { Sigui } from 'sigui'

export function HoverMarkWidget(shapes: Shapes) {
  using $ = Sigui()

  const info = $({
    color: '#fff',
  })

  const widget = Widget()
  const box = shapes.Box(widget.rect)
  box.view.color = hexToInt(info.color)
  box.view.alpha = .2

  function dispose() {
    box.remove()
  }

  return { info, widget, box, dispose }
}
