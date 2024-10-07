import { Sigui } from 'sigui'
import { dom } from 'utils'
import { createWebSocket } from '~/lib/ws.ts'
import { env } from '~/src/env.ts'
import { colorizeNick } from '~/src/pages/Chat/util.ts'
import { state } from '~/src/state.ts'

export function WebSockets() {
  using $ = Sigui()

  const ws = createWebSocket('/ws', env.VITE_API_URL)
  $.fx(() => () => ws.close())

  const el = <div />
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

  $.fx(() => dom.on(window, 'pointermove', ev => {
    if (state.user && ws.state() == 'open') {
      ws.send(`${state.user.nick},${ev.pageX.toFixed(1)},${ev.pageY.toFixed(1)}`)
    }
  }))

  return el
}
