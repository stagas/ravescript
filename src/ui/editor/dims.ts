import type { Rect } from 'editor'
import { Sigui, type $ } from 'sigui'

export type Dims = ReturnType<typeof Dims>

export function Dims({ rect }: {
  rect: $<Rect>
}) {
  using $ = Sigui()

  const info = $({
    rect,

    caretWidth: 1.5,

    charWidth: 1,
    charHeight: 1,

    lineHeight: 19,

    pageHeight: 1,
    pageWidth: 1,

    scrollX: 0,
    scrollY: 0,
  })

  return { info }
}
