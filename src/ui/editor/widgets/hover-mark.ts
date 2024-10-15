import { Widget } from 'editor'
import { Sigui } from 'sigui'

export function HoverMarkWidget() {
  using $ = Sigui()

  const info = $({
    color: '#fff3',
  })

  const widget = Widget()

  widget.draw = c => {
    const { rect } = widget
    const { x, y, w, h } = rect
    c.fillStyle = info.color
    c.fillRect(x, y, w, h)
  }

  return { info, widget }
}
