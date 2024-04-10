import { Theme } from 'daisyui'
import themes from 'daisyui/src/theming/themes'
import { Signal, storage } from 'signal-jsx'
import { Rect } from 'std'
import { dom } from 'utils'
import { hexToInt, toHex } from './util/rgb.ts'

export function Screen() {
  using $ = Signal()

  const block = (e: Event) => dom.stop.prevent(e)
  const overlayEl = <div class="z-50 fixed top-0 left-0 w-full h-full hidden"
    onmousemove={block}
    onmousedown={block}
    onmouseup={block}
    onwheel={block}
    oncontextmenu={block}
  />
  dom.body.append(overlayEl)

  const rect = $(new Rect, { pr: window.devicePixelRatio })

  const info = $({
    cursor: 'default',
    overlay: false,
    pr: rect.$.pr,
    rect,
    theme: storage<Theme>('dim'),
    get colors() {
      return themes[this.theme] ?? themes.dim
    },
    get primaryColorInt() {
      return hexToInt(toHex(this.colors.primary))
    },
    get secondaryColorInt() {
      return hexToInt(toHex(this.colors.secondary))
    },
  })

  $.fx(() => dom.on(window, 'resize', $.fn(() => {
    info.rect.w = window.innerWidth
    info.rect.h = window.innerHeight
    info.rect.pr = window.devicePixelRatio
  }), { unsafeInitial: true }))

  $.fx(function update_style_cursor() {
    dom.body.style.cursor = info.cursor
  })

  $.fx(() => {
    overlayEl.classList.toggle('hidden', !info.overlay)
  })

  return { info }
}

export const screen = Screen()
