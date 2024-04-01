import { Signal } from 'signal-jsx'
import { Point, Rect } from 'std'
import { dom } from 'utils'
import { Grid } from '../draws/grid.ts'
import { screen } from '../screen.tsx'
import { services } from '../services.ts'
import { Canvas } from './Canvas.tsx'

const DEBUG = true

export type Time = ReturnType<typeof Time>

export function Time(grid: Grid) {
  using $ = Signal()

  const WIDTH = 128
  const view = $(new Rect($(new Point, {
    x: WIDTH,
    y: 34,
  })), {
    pr: screen.info.$.pr
  })

  const canvas = <Canvas actual view={view} class="-mb-[1px]" /> as Canvas
  const el = <div class="relative m-1.5 h-8">{canvas}</div>

  $.fx(() => dom.on(canvas, 'contextmenu', e => {
    e.preventDefault()
  }))

  const c = canvas.getContext('2d', { alpha: true })!

  $.fx(() => {
    const { info } = grid
    const { boxes } = $.of(info)
    const { left, width, rows } = boxes.info
    const { colors } = screen.info
    const { pr, w, h } = view
    const { timeNowLerp: t } = services.audio.info

    $()

    view.clear(c)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = screen.info.colors['secondary']
    c.fillText(`${t}`, 0, h / 2, w)

    // c.restore()
  })

  return { el, canvas }
}
