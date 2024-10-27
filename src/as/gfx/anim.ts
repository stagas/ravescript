import { Sigui } from 'sigui'
import { AnimMode } from '~/src/constants.ts'
import { state } from '~/src/state.ts'

const DEBUG = false //true

export type Anim = ReturnType<typeof Anim>

export function Anim() {
  DEBUG && console.log('[anim] create')
  using $ = Sigui()

  const Modes = Object.values(AnimMode)

  const info = $({
    isRunning: false,
    mode: state.$.animMode,
    epoch: 0,
  })

  const ticks = new Set<() => boolean | void>()

  let lastEpoch = -1 // cause initial draw to happen
  let animFrame: any

  const tick = $.fn(function tick() {
    DEBUG && console.log('[anim] tick', info.epoch)

    if (info.epoch === lastEpoch && info.mode === AnimMode.Auto) {
      info.isRunning = false
      DEBUG && console.log('[anim] exit')
      return
    }

    lastEpoch = info.epoch

    for (const tick of ticks) {
      if (tick()) info.epoch++
    }

    animFrame = requestAnimationFrame(tick)
  })

  function cycle() {
    info.mode = Modes[
      (Modes.indexOf(info.mode) + 1) % Modes.length
    ]
  }

  function stop() {
    cancelAnimationFrame(animFrame)
    info.isRunning = false
  }

  function start() {
    if (info.isRunning) return
    stop()
    info.isRunning = true
    animFrame = requestAnimationFrame(tick)
  }

  $.fx(() => {
    const { epoch, mode } = info
    $()
    DEBUG && console.log('[anim]', mode, epoch)
    if (mode === AnimMode.Off) {
      stop()
    }
    else {
      start()
    }
  })

  $.fx(() => () => {
    DEBUG && console.log('[anim] dispose')
    stop()
  })

  state.animCycle = cycle

  return { info, ticks, cycle }
}
