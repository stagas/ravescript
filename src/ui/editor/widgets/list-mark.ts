import { hexToInt, Widget, type Pane } from 'editor'
import { Sigui } from 'sigui'
import { assign } from 'utils'
import { SoundValueKind } from '~/as/assembly/dsp/vm/dsp-shared.ts'
import type { SoundValue } from '~/src/as/dsp/shared.ts'
import type { Token } from '~/src/lang/tokenize.ts'
import { modWrap } from '~/src/util/mod-wrap.ts'

export type ListMarkWidget = ReturnType<typeof ListMarkWidget>

export function ListMarkWidget(pane: Pane) {
  using $ = Sigui()

  const info = $({
    color: '#fff',
    list: [] as Token.Bounds[],
    indexValue$: -1,
    value: -1,
  })

  const widget = Widget()
  const box = pane.draw.shapes.Box(widget.rect)
  box.view.color = hexToInt(info.color)
  box.view.alpha = .2

  function update(audios: Float32Array[], values: SoundValue[], scalars: Float32Array) {
    const value = values[info.indexValue$]
    if (value.kind === SoundValueKind.Scalar) {
      info.value = scalars[value.ptr]
    }
    else if (value.kind === SoundValueKind.Audio) {
      info.value = audios[value.ptr][0]
    }
    assign(widget.bounds, info.list[modWrap(info.value, info.list.length) >> 0])
    pane.draw.updateMarkRect(widget)
  }

  function dispose() {
    box.remove()
  }

  return { info, widget, box, update, dispose }
}
