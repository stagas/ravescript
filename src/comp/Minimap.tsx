import { Signal } from 'signal-jsx'
import { Matrix, Point, Rect } from 'std'
import { MouseButtons, dom } from 'utils'
import { Grid } from '../draws/grid.ts'
import { layout } from '../layout.ts'
import { screen } from '../screen.tsx'
import { log } from '../state.ts'
import { toHex } from '../util/rgb.ts'
import { Canvas } from './Canvas.tsx'
import { services } from '../services.ts'

const DEBUG = true

export type Minimap = ReturnType<typeof Minimap>

export function Minimap(grid: Grid) {
  using $ = Signal()

  const view = $(new Rect($(new Point, {
    x: layout.info.$.minimapWidth,
    y: 34,
  })), {
    pr: screen.info.$.pr
  })

  const handleView = $(new Rect($(new Point, {
    x: layout.info.$.minimapHandleWidth,
    y: 42,
  })), {
    pr: screen.info.$.pr
  })

  const canvas = <Canvas actual view={view} class="-mb-[1px]" /> as Canvas
  const handle = <Canvas actual view={handleView} class="absolute -left-[5px] -top-[4px]" /> as Canvas
  const el = <div class="relative m-1.5 h-8">
    {canvas}
    {handle}
  </div>

  $.fx(() => dom.on(canvas, 'contextmenu', e => {
    e.preventDefault()
  }))

  $.fx(() => dom.on(handle, 'contextmenu', e => {
    e.preventDefault()
  }))

  $.fx(() => dom.on(handle, 'wheel', e => {
    grid.snap.x = false
    const m = grid.intentMatrix
    grid.mousePos.x = (-m.e / m.a) + 1 / m.a
    grid.mousePos.y = 0
    grid.handleWheelScaleX(e)
    DEBUG && log('wheel', grid.mousePos.x, grid.mousePos.y)
  }, { passive: true }))

  $.fx(() => dom.on(handle, 'mousedown', e => {
    if (!(e.buttons & MouseButtons.Left)) return

    const rect = handle.getBoundingClientRect()

    function moveToTarget(e: MouseEvent) {
      grid.snap.x = false
      const m = grid.intentMatrix
      const boxes = grid.info.boxes
      if (!boxes) return

      const x = (e.pageX - rect.left) / view.w
      const y = (e.pageY - rect.top) / view.h

      const { left, width } = boxes.info

      m.e = -x * width * m.a + grid.view.w / 2 - left * m.a
    }

    const off = dom.on(window, 'mousemove', e => {
      e.stopImmediatePropagation()
      e.preventDefault()
      moveToTarget(e)
    })

    dom.on(window, 'mouseup', e => {
      off()
    }, { once: true })

    moveToTarget(e)
  }))

  const c = canvas.getContext('2d', { alpha: true })!
  const hc = handle.getContext('2d', { alpha: true })!
  const matrix = new Matrix()
  $.fx(() => {
    const { info } = grid
    const { boxes } = $.of(info)
    const { left, width, rows } = boxes.info
    const { colors } = screen.info
    const { pr, w, h } = view
    const { timeNowLerp: t } = services.audio.info
    $()
    Matrix.viewBox(matrix, view, {
      x: left,
      y: 0,
      w: width / view.pr,
      h: rows.length / view.pr - (1 / view.h),
    })
    c.save()
    c.scale(pr, pr)
    view.clear(c)
    // view.fill(c, toHex(colors['base-100']))
    c.setTransform(matrix)
    for (const row of boxes.info.rows) {
      c.beginPath()
      let color
      for (const { rect, trackBox } of row) {
        const { x, y, w, h } = rect
        color = trackBox.track.info.color
        c.rect(x, y + 10 * (1 / view.h), w - (1.5 / matrix.a) * pr, h - 20 * (1 / view.h))
      }
      c.fillStyle = '#' + (color ?? 0x0).toString(16).padStart(6, '0')
      c.fill()
    }

    {
      const x = t + .5 / matrix.a
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x, view.h)
      c.lineWidth = 1.5 / matrix.a
      c.strokeStyle = toHex(colors['primary'])
      c.stroke()
    }

    c.restore()
  })

  $.fx(() => {
    const { a, b, c: mc, d, e, f } = grid.intentMatrix
    const { w: vw, h: vh } = grid.view
    const { pr } = handleView
    const { info } = grid
    const { boxes } = $.of(info)
    const { left } = boxes.info
    const { colors } = screen.info
    const { timeNow } = services.audio.info

    $()

    const c = hc

    c.save()
    c.scale(pr, pr)
    handleView.clear(c)
    c.translate(.5, 2.5)

    const x = -((e + left * a) / a / pr) * matrix.a
    const y = -((f) / d / pr) * matrix.d
    const w = ((vw - 5) / a / pr) * matrix.a + 9
    const h = (vh / d / pr) * matrix.d + 2

    c.beginPath()
    c.rect(x, y, w, h)
    const color = toHex(colors['base-content'])
    c.fillStyle = color + '22'
    c.fill()

    // {
    //   const time = timeNow - boxes.info.left
    //   const aPos = time / boxes.info.width
    //   const x = ((aPos * (vw - 5) / pr)) + 4.5
    //   c.beginPath()
    //   c.moveTo(x, y)
    //   c.lineTo(x, y + h)
    //   c.lineWidth = 1
    //   c.strokeStyle = toHex(colors['primary'])
    //   c.stroke()
    // }
    c.restore()
  })

  return { el, canvas, handle }
}
