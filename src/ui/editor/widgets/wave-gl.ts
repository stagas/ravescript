import { Widget } from 'editor'
import { wasm, type Shapes } from 'gfx'
import { Sigui } from 'sigui'
import { hexToInt } from '~/src/ui/editor/util/rgb.ts'

export type WaveGlWidget = ReturnType<typeof WaveGlWidget>

export function WaveGlWidget(shapes: Shapes) {
  using $ = Sigui()

  const info = $({
    floats: wasm.alloc(Float32Array, 0),
    color: '#f09',
  })

  const widget = Widget()
  const wave = shapes.Wave(widget.rect)

  $.fx(() => {
    const { floats, color } = info
    const { w } = widget.rect
    $()
    wave.view.floats$ = floats.ptr
    wave.view.color = hexToInt(color)
    wave.view.coeff = floats.length / w
    wave.view.lw = 1
    wave.view.len = floats.length
  })

  function dispose() {
    wave.remove()
  }

  return { info, widget, dispose }
}
