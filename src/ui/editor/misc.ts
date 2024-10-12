import { Sigui } from 'sigui'

export type Misc = ReturnType<typeof Misc>

export function Misc() {
  using $ = Sigui()

  const info = $({
    isFocus: false,
    commentSingle: ';',
    commentDouble: ['[;', ']'],
  })

  return { info }
}
