import { Signal, storage } from 'signal-jsx'
import { screen } from './screen.tsx'
import { HEADER_HEIGHT } from './constants.ts'

export function Layout() {
  using $ = Signal()
  const info = $({
    get minimapWidth() {
      return this.codeWidth - 50 * 3 - 15 - 145
    },
    get minimapHandleWidth() {
      return this.minimapWidth + 10
    },
    mainY: storage(window.innerHeight / 100 * 60),
    get mainYBottom() { return this.mainY + HEADER_HEIGHT / 2 + 2 },
    codeWidthPct: 0.5,
    get codeWidth() {
      return screen.info.rect.w * this.codeWidthPct
    },
    get codeHeight() {
      return screen.info.rect.h - (this.mainY + HEADER_HEIGHT / 2) - 2
    },
    get previewWidth() {
      return screen.info.rect.w - this.codeWidth - 2
    },
  })
  return { info }
}

export const layout = Layout()
