import { Sigui } from 'sigui'

export type Dims = ReturnType<typeof Dims>

export function Dims() {
  using $ = Sigui()

  const info = $({
    caretWidth: 1.5,

    charWidth: 1,
    charHeight: 1,

    lineHeight: 19,
  })

  return { info }
}
