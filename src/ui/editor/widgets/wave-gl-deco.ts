import { Widget } from 'editor'
import { wasm, type Rect, type Shapes } from 'gfx'
import { Sigui } from 'sigui'
import type { SoundValue } from '~/src/as/dsp/shared.ts'
import { hexToInt } from '~/src/ui/editor/util/rgb.ts'
import { Stabilizer } from '~/src/util/stabilizer.ts'

export type WaveGlDecoWidget = ReturnType<typeof WaveGlDecoWidget>

export function WaveGlDecoWidget(shapes: Shapes, rect?: Rect) {
  using $ = Sigui()

  const info = $({
    index: -1,
    resultValue: null as null | SoundValue,
    previewFloats: wasm.alloc(Float32Array, 0),
    floats: wasm.alloc(Float32Array, 0),
    stabilizer: new Stabilizer(),
    stabilizerTemp: wasm.alloc(Float32Array, 0),
    color: '#fff',
  })

  const widget = Widget(rect)
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
