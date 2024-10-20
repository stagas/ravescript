import { hexToInt, Widget } from 'editor'
import { Rect, type Shapes } from 'gfx'
import { wasm } from 'rms'
import { Sigui } from 'sigui'
import { getMemoryView } from 'utils'
import { BUFFER_SIZE } from '~/as/assembly/dsp/constants.ts'
import { ShapeOpts } from '~/as/assembly/gfx/sketch-shared.ts'

export type RmsDecoWidget = ReturnType<typeof RmsDecoWidget>

export function RmsDecoWidget(shapes: Shapes) {
  using $ = Sigui()

  const info = $({
    rect: Rect(),
    index: -1,
    color: '#fff',
    peak: 0,
    value: 0,
  })

  const rmsFloats = getMemoryView(wasm.memory).getF32(+wasm.floats, BUFFER_SIZE)
  const widget = Widget()
  const box = shapes.Box(info.rect)
  box.view.opts |= ShapeOpts.Collapse | ShapeOpts.NoMargin
  box.view.color = hexToInt(info.color)

  $.fx(() => {
    const { rect } = info
    const { pr, x, y, w, h } = widget.rect
    $()
    rect.x = x + 3
    rect.y = y
    rect.w = 4
    rect.h = h
  })

  $.fx(() => {
    const { rect, value } = info
    const { y, h } = widget.rect
    $()
    rect.h = value * h
    rect.y = y + h - rect.h
  })

  function update(floats: Float32Array) {
    rmsFloats.set(floats)
    info.value = wasm.run()
  }

  function dispose() {
    box.remove()
  }

  return { info, widget, box, update, dispose }
}
