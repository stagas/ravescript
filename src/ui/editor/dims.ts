import { Sigui, type Signal } from 'sigui'

export type Dims = ReturnType<typeof Dims>

export function Dims({ width, height }: {
  width: Signal<number>,
  height: Signal<number>,
}) {
  using $ = Sigui()

  const info = $({
    width,
    height,

    caretWidth: 1.5,

    charWidth: 1,
    charHeight: 1,

    lineHeight: 19,

    get pageHeight() {
      return Math.floor(info.height / info.lineHeight)
    },
    get pageWidth() {
      return Math.floor(info.width / info.charWidth)
    }
  })

  return { info }
}
