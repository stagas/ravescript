import { Sigui } from 'sigui'
import { dom, isMobile } from 'utils'
import { createWebSocket } from '~/lib/ws.ts'
import { env } from '~/src/env.ts'
import { colorizeNick } from '~/src/pages/Chat/util.ts'
import { state } from '~/src/state.ts'

export function WebSockets() {
  using $ = Sigui()

  const ws = createWebSocket('/ws', env.VITE_API_URL)
  $.fx(() => () => ws.close())

  const el = <div class="w-full h-[calc(100dvh-4.5rem)] touch-none" /> as HTMLDivElement
  const pointers = new Map<string, HTMLDivElement>()

  ws.onmessage = ({ data }) => {
    const [nick, x, y] = data.split(',')

    let pointer = pointers.get(nick)
    if (!pointer) {
      pointers.set(nick, pointer = <div class="absolute w-3 h-3 rounded-full" style={{ background: colorizeNick(nick) }} /> as HTMLDivElement)
      el.append(pointer)
    }
    pointer.style.left = x + 'px'
    pointer.style.top = y + 'px'
  }

  $.fx(() => [
    dom.on(el, isMobile() ? 'touchmove' : 'pointermove', ev => {
      ev.preventDefault()

      const p: { pageX: number, pageY: number } = ev.type === 'touchmove'
        ? (ev as TouchEvent).touches[0]!
        : ev as PointerEvent

      if (state.user && ws.state() == 'open') {
        ws.send(`${state.user.nick},${p.pageX.toFixed(1)},${p.pageY.toFixed(1)}`)
      }
    }, { passive: false })
  ].filter(Boolean))

  return el
}
