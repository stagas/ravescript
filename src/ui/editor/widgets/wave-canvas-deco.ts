import { Widget } from 'editor'
import { Sigui } from 'sigui'
import { clamp } from 'utils'
import { screen } from '~/src/screen.ts'

export function WaveCanvasWidget() {
  using $ = Sigui()

  const info = $({
    floats: new Float32Array(),
    color: '#f09',
  })

  const widget = Widget()
  widget.draw = c => {
    const { floats, color } = info
    const { rect } = widget
    const { pr } = screen

    const coeff = floats.length / rect.w
    const startIndex = 0
    const scaleY = 1
    const width = rect.w
    const height = rect.h
    const step = .5

    const startX = (startIndex / coeff) | 0

    c.save()

    c.translate(rect.x, rect.y)

    let x = 0, y, h

    h = clamp(-1, 1, floats[(x + startX) * coeff | 0]!) * scaleY * 0.5 + 0.5
    y = (height - pr) * h + pr / 2
    c.beginPath()
    c.moveTo(x, y)

    x += step

    for (; x < width; x += step) {
      h = clamp(-1, 1, floats[(x + startX) * coeff | 0]!) * scaleY * 0.5 + 0.5
      y = (height - pr) * h + pr / 2
      c.lineTo(x, y)
    }

    c.lineWidth = 1
    c.strokeStyle = color
    c.stroke()

    c.restore()
  }

  return { info, widget }
}
