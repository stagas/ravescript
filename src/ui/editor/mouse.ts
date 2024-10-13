import { Linecol, type Draw } from 'editor'
import { Sigui } from 'sigui'
import { assign } from 'utils'

export function Mouse({ draw }: {
  draw: Draw
}) {
  using $ = Sigui()

  const info = $({
    isDown: false,
    clickTimeout: -1 as any,
    buttons: 0,
    count: 0,
    x: 0,
    y: 0,
    linecol: $(Linecol()),
  })

  $.fx(() => {
    const { x, y } = info
    $()
    assign(info.linecol, draw.linecolFromViewPoint(info))
  })

  return { info }
}
