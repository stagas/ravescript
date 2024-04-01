import { Signal } from 'signal-jsx'
import { Point, Rect } from 'std'
import { dom } from 'utils'
import { screen } from '../screen.tsx'
import { services } from '../services.ts'
import { Canvas } from './Canvas.tsx'

const DEBUG = true

const REPEAT_DELAY = 400
const REPEAT_SPEED = 1000 / 9

export type Bpm = ReturnType<typeof Bpm>

export function Bpm() {
  using $ = Signal()

  const WIDTH = 44

  const view = $(new Rect($(new Point, {
    x: WIDTH,
    y: 44,
  })), {
    pr: screen.info.$.pr
  })

  const info = $({
    isHovering: false,
    dir: 0,
  })

  const canvas = <Canvas actual view={view} /> as Canvas
  const c = canvas.getContext('2d', { alpha: true })!

  const el = <div class="relative">{canvas}</div>

  const mousePos = $(new Point)
  let isDown = false

  $.fx(() => [
    dom.on(canvas, 'contextmenu', e => {
      e.preventDefault()
    }),
    dom.on(canvas, 'mouseenter', e => {
      info.isHovering = true
    }),
    dom.on(canvas, 'mousemove', e => {
      mousePos.setFromEvent(e, canvas)
    }),
    dom.on(canvas, 'mouseleave', e => {
      info.isHovering = false
    }),
    dom.on(canvas, 'mousedown', e => {
      if (!info.dir) return
      e.preventDefault()
      e.stopPropagation()

      isDown = true

      services.audio.info.bpm += info.dir

      let iv: any

      const longClickTimeout = setTimeout(() => {
        iv = setInterval(() => {
          services.audio.info.bpm += info.dir
        }, REPEAT_SPEED)
      }, REPEAT_DELAY)

      dom.on(window, 'mouseup', e => {
        isDown = false
        clearTimeout(longClickTimeout)
        clearInterval(iv)
      }, { once: true })
    }),
  ])

  $.fx(() => {
    const { isHovering } = info
    const { pr, hh } = view
    let { y } = mousePos
    $()
    const rect = canvas.getBoundingClientRect()
    y -= rect.y
    info.dir = isHovering || isDown ? y < hh ? +1 : -1 : 0
    // screen.info.cursor = info.dir ? 'pointer' : 'default'
  })

  $.fx(() => {
    const { dir } = info
    const { bpm } = services.audio.info
    const { pr, w, h, hh, hw, } = view

    $()

    c.save()
    c.scale(pr, pr)
    view.clear(c)

    c.fillStyle = screen.info.colors['base-content'] + '20'
    if (dir > 0) {
      c.beginPath()
      c.moveTo(0, hh)
      c.lineTo(hw, 0)
      c.lineTo(w, hh)
      c.closePath()
      c.fill()
    }
    else if (dir < 0) {
      c.beginPath()
      c.moveTo(0, hh)
      c.lineTo(hw, h)
      c.lineTo(w, hh)
      c.closePath()
      c.fill()
    }

    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = screen.info.colors['base-content']
    c.font = '19.5px Mono'

    c.fillText(`${bpm}`, hw, hh + 2.5, w)

    c.restore()
  })

  return { el, canvas }
}
