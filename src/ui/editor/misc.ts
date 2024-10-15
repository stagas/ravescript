import { Sigui } from 'sigui'

export type Misc = ReturnType<typeof Misc>

export function Misc() {
  using $ = Sigui()

  const info = $({
    commentSingle: ';',
    commentDouble: ['[;', ']'],
  })

  return { info }
}
