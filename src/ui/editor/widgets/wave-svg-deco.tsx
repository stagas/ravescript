import { Widget } from 'editor'
import { Sigui } from 'sigui'
import { clamp } from 'utils'

export function WaveSvgWidget() {
  using $ = Sigui()

  const info = $({
    floats: new Float32Array(),
    color: '#f09',
  })

  const path = <path
    d=""
    fill="none"
    stroke="#f09"
    stroke-width="1"
    miter-limit="1"
    linecap="round"
    linejoin="round"
  /> as SVGElement

  const widget = Widget()
  const { rect } = widget

  const svg = <svg
    x={() => rect.x}
    y={() => rect.y}
    width={() => rect.width}
    height={() => rect.height}
    viewBox={() => `-1 -${rect.h / 2} ${rect.w} ${rect.h + 1}`}
  >{path}</svg> as SVGElement

  widget.draw = c => {
    const { floats } = info
    const { w, h } = widget.rect

    let d = ''
    const coeff = floats.length / w
    const startIndex = 0
    const scaleY = h
    const step = .5

    const startX = (startIndex / coeff) | 0

    let x = 0, y

    y = clamp(-1, 1, floats[(x + startX) * coeff | 0]!) * scaleY * 0.5 + 0.5
    d += `M ${x} ${y}`

    x += step

    for (; x < w; x += step) {
      y = clamp(-1, 1, floats[(x + startX) * coeff | 0]!) * scaleY * 0.5 + 0.5
      d += `L ${x} ${y}`
    }

    path.setAttribute('d', d)
  }

  return { info, widget, svg }
}
