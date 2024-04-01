import { Signal } from 'signal-jsx'
import { Point, Rect } from 'std'
import { dom, fract } from 'utils'
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

  const info = $({
    text: '-'
  })

  const canvas = <Canvas actual view={view} class="-mb-[1px]" /> as Canvas
  const el = <div class="relative">{canvas}</div>

  $.fx(() => dom.on(canvas, 'contextmenu', e => {
    e.preventDefault()
  }))

  const c = canvas.getContext('2d', { alpha: true })!

  $.fx(() => {
    const { boxes } = $.of(grid.info)
    const { left } = boxes.info
    const { timeNowLerp: t } = services.audio.info

    $()

    const time = t - left
    const bars = Math.floor(time) + 1
    const frac = fract(time)
    const fourths = Math.floor(frac * 4) + 1
    const secs = Math.floor((time / services.audio.player.clock.coeff))
    const mins = Math.floor(secs / 60)
    info.text = `${bars}.${fourths} ${mins}:${(secs % 60).toString().padStart(2, '0')}`
  })

  $.fx(() => {
    const { text } = info
    const { pr, w, h } = view

    $()

    c.save()
    c.scale(pr, pr)
    view.clear(c)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = screen.info.colors['base-content']
    c.font = '19.5px Mono'

    c.fillText(text, w / 2, h / 2 + 2.5, w)

    c.restore()
  })

  return { el, canvas }
}
