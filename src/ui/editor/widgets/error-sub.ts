import { Widget } from 'editor'
import { Sigui } from 'sigui'
import { drawText } from 'utils'

export function ErrorSubWidget() {
  using $ = Sigui()

  const info = $({
    color: '#f00',
    error: null as null | Error
  })

  const widget = Widget()

  widget.draw = c => {
    const { color, error } = info
    if (!error) return
    const { rect } = widget
    const { x, y, w, h } = rect
    c.beginPath()
    c.moveTo(x, y - 2)
    for (let sx = x; sx < x + w + 3; sx += 3) {
      c.lineTo(sx, y - 2 + (sx % 2 ? 0 : 2))
    }
    c.strokeStyle = color
    c.stroke()
    drawText(c, { x, y: y + 1 }, error.message, color, .025, color)
  }

  return { info, widget }
}
