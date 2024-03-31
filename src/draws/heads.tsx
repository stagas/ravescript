import { Signal } from 'signal-jsx'
import { Point, Rect } from 'std'
import { MouseButtons, dom } from 'utils'
import { HEADER_HEIGHT, HEADS_WIDTH } from '../constants.ts'
import { Track, palette } from '../dsp/track.ts'
import { lib } from '../lib.ts'
import { screen } from '../screen.tsx'
import { state } from '../state.ts'
import { Surface } from '../surface.ts'
import { fromSvg } from '../util/svg-to-image.ts'
import { Grid } from './grid.ts'
import { layout } from '../layout.ts'
import { Canvas } from '../comp/Canvas.tsx'
import { intToHex } from '../util/rgb.ts'

const DEBUG = true

export type Heads = ReturnType<typeof Heads>

export function Heads(surface: Surface, grid: Grid) {
  using $ = Signal()

  const view = $(new Rect, { pr: screen.info.$.pr })
  $.fx(() => {
    const { w, h } = surface.view
    $()
    view.w = HEADS_WIDTH
    view.h = h
  })

  const info = $({
    hoveringTrack: null as Track | null,
    contextMenuTrack: null as Track | null,
  })

  function Colors() {
    return <div class="flex flex-row flex-nowrap cursor-pointer">{palette.map(x =>
      <button class={`w-6 h-6 flex items-center justify-center hover:bg-base-100 hover:bg-opacity-80`}>
        <div class="w-4 h-4" style={{ background: intToHex(x) }}></div>
      </button>
    )}</div>
  }

  const contextmenu = <div class="w-fit fixed z-50 bg-base-100 text-base-content py-1">
    <div class="w-[280px]">
      {[
        [<div class="flex flex-row flex-nowrap items-center justify-between"><div>Change color</div> <Colors /></div>],
        [<div class="flex flex-row flex-nowrap items-center justify-between"><div>Duplicate as</div> <Colors /></div>],
        [<div class="flex flex-row flex-nowrap items-center justify-between"><div>Insert as</div> <Colors /></div>],
        [<div class="flex flex-row flex-nowrap items-center justify-between">
          Remove
          <div class="w-4 h-4 mr-1" style={() => ({
            background: info.hoveringTrack?.info.colors?.hexColor ?? '#fff'
          })} />
        </div>, () => {
          if (info.contextMenuTrack) lib.project?.removeTrack(info.contextMenuTrack)
        }]
      ].map(([label, onclick]) =>
        <button onclick={onclick} class="w-full pl-4 pr-3 h-8 text-sm box-border text-left hover:bg-primary hover:text-primary-content cursor-default">
          {label}
        </button>
      )}
    </div>
  </div> as HTMLDivElement

  const canvas = <Canvas actual onresize={(y) => {
    // surface.sketch.view.y = y
  }} view={view} class="
    absolute left-0 top-0
    pixelated
  " /> as Canvas

  canvas.title = 'Left click - Play sound\nWheel - Volume\nRight click - More options'

  let contextMenuOpen = false
  $.fx(() => dom.on(canvas, 'contextmenu', e => {
    e.preventDefault()
    e.stopPropagation()
    contextMenuOpen = false
    handleHover(e)
    contextMenuOpen = true
    info.contextMenuTrack = info.hoveringTrack
    contextmenu.style.left = e.pageX + 'px'
    contextmenu.style.top = e.pageY + 'px'
    dom.body.append(contextmenu)
    dom.on(window, 'pointerdown', e => {
      if (!e.composedPath().includes(contextmenu)) {
        e.preventDefault()
        e.stopPropagation()
        contextMenuOpen = false
        contextmenu.remove()
      }
      else {
        dom.on(window, 'pointerup', e => {
          requestAnimationFrame(() => {
            contextMenuOpen = false
            contextmenu.remove()
          })
        }, { capture: true, once: true })
      }
    }, { capture: true, once: true })
  }))

  const c = canvas.getContext('2d', { alpha: true })!
  c.imageSmoothingEnabled = false

  const selfView = $(new Rect, { pr: screen.info.$.pr }).set(view)
  const hitArea = $(new Rect)
  const r = $(new Rect)

  const mousePos = $(new Point)

  function handleHover(e: MouseEvent | WheelEvent) {
    const { pr } = screen.info
    if (!lib.project) return

    const { project: { info: { tracks } } } = lib
    mousePos.x = e.pageX * pr
    mousePos.y = e.pageY * pr

    r.set(hitArea)
    r.x += c.canvas.offsetLeft * pr

    const last = tracks.at(-1)
    if (!last) return

    let hoveringTrack = null as null | Track

    if (mousePos.withinRect(r) && mousePos.y < last.info.sy + dims.h) {
      for (const track of tracks) {
        if (mousePos.y > track.info.sy && mousePos.y < track.info.sy + dims.h) {
          hoveringTrack = track
          break
        }
      }
    }

    if (hoveringTrack) {
      if (!state.isHoveringHeads) {
        // grid.updateHoveringBox(info.hoveringTrack.info.boxes[0]?. ?? null)
        screen.info.cursor = 'pointer'
        state.isHoveringHeads = true
      }
    }
    else {
      if (state.isHoveringHeads) {
        screen.info.cursor = 'default'
        state.isHoveringHeads = false
      }
    }

    if (!contextMenuOpen) {
      info.hoveringTrack = hoveringTrack
      surface.anim.info.epoch++
    }
  }

  $.fx(() => dom.on(window, 'mousemove', $.fn((e: MouseEvent) => {
    handleHover(e)
  })))

  $.fx(() => dom.on(window, 'mousedown', $.fn((e: MouseEvent) => {
    if (!(e.buttons & MouseButtons.Left)) return

    const { hoveringTrack } = info

    if (hoveringTrack) {
      e.stopImmediatePropagation()
      e.preventDefault()

      hoveringTrack.play()

      dom.on(window, 'mouseup', e => {
        e.stopImmediatePropagation()
        e.preventDefault()
      }, { once: true })
    }
  })))

  selfView.set(view)

  // $.fx(() => {
  //   const { mode } = state
  //   $()
  //   selfView.set(view)
  //   if (mode === 'edit' || mode === 'dev') {
  //     selfView.w -= CODE_WIDTH
  //     selfView.x += CODE_WIDTH
  //   }
  // })

  const icons = $({
    play: $.unwrap(() => fromSvg(/*html*/`
      <svg xmlns="http://www.w3.org/2000/svg" width="110" height="75" class="h-[20px] w-10" preserveAspectRatio="xMidYMid slice" viewBox="-10 -10 44 44">
        <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" d="M7 17.259V6.741a1 1 0 0 1 1.504-.864l9.015 5.26a1 1 0 0 1 0 1.727l-9.015 5.259A1 1 0 0 1 7 17.259" />
      </svg>
    `, '#000', '#fff')),
    // stop: $.unwrap(() => fromSvg(/*html*/`
    //   <svg xmlns="http://www.w3.org/2000/svg" height="34" width="34" viewBox="0 0 24 24">
    //     <path fill="currentColor" d="M14 3v10.56c-.59-.35-1.27-.56-2-.56c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V3z" />
    //   </svg>
    // `)),
    // loop: $.unwrap(() => fromSvg(/*html*/`
    //   <svg xmlns="http://www.w3.org/2000/svg" height="47" width="47" viewBox="0 0 24 24">
    //     <path fill="currentColor" d="M16.47 5.47a.75.75 0 0 0 0 1.06l.72.72h-3.813a1.75 1.75 0 0 0-1.575.987l-.21.434a.4.4 0 0 0 0 .35l.568 1.174a.2.2 0 0 0 .36 0l.632-1.304a.25.25 0 0 1 .225-.141h3.812l-.72.72a.75.75 0 1 0 1.061 1.06l2-2a.75.75 0 0 0 0-1.06l-2-2a.75.75 0 0 0-1.06 0m-6.436 9.859a.4.4 0 0 0 0-.35l-.57-1.174a.2.2 0 0 0-.36 0l-.63 1.304a.25.25 0 0 1-.226.141H5a.75.75 0 0 0 0 1.5h3.248a1.75 1.75 0 0 0 1.575-.987z" />
    //     <path fill="currentColor" d="M16.47 18.53a.75.75 0 0 1 0-1.06l.72-.72h-3.813a1.75 1.75 0 0 1-1.575-.987L8.473 8.89a.25.25 0 0 0-.225-.141H5a.75.75 0 0 1 0-1.5h3.248c.671 0 1.283.383 1.575.987l3.329 6.872a.25.25 0 0 0 .225.141h3.812l-.72-.72a.75.75 0 1 1 1.061-1.06l2 2a.75.75 0 0 1 0 1.06l-2 2a.75.75 0 0 1-1.06 0" />
    //   </svg>
    // `)),
    // solo: $.unwrap(() => fromSvg(/*html*/`
    //   <svg xmlns="http://www.w3.org/2000/svg" height="36" width="36" viewBox="0 0 256 256">
    //     <path fill="currentColor" d="M252 56a12 12 0 0 1-12 12h-44v36a12 12 0 0 1-12 12h-44v36a12 12 0 0 1-12 12H84v36a12 12 0 0 1-12 12H16a12 12 0 0 1 0-24h44v-36a12 12 0 0 1 12-12h44v-36a12 12 0 0 1 12-12h44V56a12 12 0 0 1 12-12h56a12 12 0 0 1 12 12" />
    //   </svg>
    // `)),
    // mute: $.unwrap(() => fromSvg(/*html*/`
    //   <svg xmlns="http://www.w3.org/2000/svg" height="48" width="48" viewBox="0 0 32 32">
    //     <rect fill="currentColor" x="6" y="8" height="8" width="8" />
    //     <rect fill="currentColor" x="22" y="8" height="8" width="8" />
    //     <path stroke="currentColor" d="M 6 12 L 22 12" />
    //   </svg>
    // `)),
  })

  $.fx(() => {
    const { pr } = screen.info
    const { play } = $.of(icons)
    // const { play, stop, loop, solo, mute } = $.of(icons)
    $()
    surface.anim.info.epoch++
  })

  const dims = $({
    get w() {
      return 55 * screen.info.pr
    },
    get h() {
      return surface.viewMatrix.d * screen.info.pr
    },
  })

  const tick = () => {
    // c.restore()
    c.save()

    r.set(hitArea).clear(c)

    if (!grid || !surface) return

    const { pr } = screen.info

    c.translate(0, surface.canvas.offsetTop * pr)

    hitArea.setParameters(0, 0, HEADS_WIDTH * pr, layout.info.mainY * pr)
    hitArea.clip(c)

    const { w, h } = dims

    if (!lib.project) return
    for (const track of lib.project.info.tracks) {
      let y = track.info.sy
      let th = h
      if (y + th < 0) continue
      if (y < 0) {
        th += y
        y = 0
      }
      c.save()
      c.beginPath()
      c.rect(0, y, w, th - pr)
      c.fillStyle =
        (info.hoveringTrack === track
          ? track.info.colors.hexColorBrighter
          : track.info.colors.hexColorBright) ?? '#fff'
      c.fill()
      c.clip()
      if (icons?.play) c.drawImage(
        // info.hoveringTrack === track
        //   ? icons.play.img_hover
        //   :
        icons.play.img,
        0, 0, icons.play.img.width, icons.play.img.height,
        0, y, w, w * (icons.play.img.height / icons.play.img.width),
      )
      c.restore()
      c.beginPath()
      c.moveTo(w, y)
      c.lineTo(w, y + th - pr)
      c.strokeStyle = '#000'
      c.lineWidth = pr * 2
      c.stroke()
    }

    c.restore()
    // c.save()
  }

  $.fx(() => {
    surface.anim.ticks.add(tick)
    return () => {
      surface.anim.ticks.delete(tick)
    }
  })

  return { canvas, hitArea }
}
