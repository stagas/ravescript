import { $ } from 'sigui'
import { dom } from 'utils'

export const screen = $({
  pr: window.devicePixelRatio,
  width: window.visualViewport!.width,
  height: window.visualViewport!.height,
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

$.fx(() => [
  dom.on(window, 'resize', $.fn(() => {
    const viewport = window.visualViewport!
    screen.pr = window.devicePixelRatio
    screen.width = viewport.width
    screen.height = viewport.height
  }), { unsafeInitial: true }),

  dom.on(document, 'focus', () => {
    console.log('trigger focus')
  })
])
