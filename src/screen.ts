import { $ } from 'sigui'
import { dom } from 'utils'

export const screen = $({
  pr: window.devicePixelRatio,
  width: window.innerWidth,
  height: window.innerHeight,
  get sm() {
    return screen.width < 640
  },
  get md() {
    return screen.width >= 640
  },
  get lg() {
    return screen.width >= 768
  },
})

dom.on(window, 'resize', () => {
  screen.pr = window.devicePixelRatio
  screen.width = window.innerWidth
  screen.height = window.innerHeight
}, { unsafeInitial: true })
