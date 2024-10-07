import { createBus } from '~/api/core/create-bus.ts'
import { Router } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'

const clients = new Set<WebSocket>()

const bus = createBus(['ws'])
bus.onmessage = event => sendToLocalClients(null, event.data)

function broadcast(ws: WebSocket | null, { data }: { data: string }) {
  bus.postMessage(data)
  sendToLocalClients(ws, data)
}

function sendToLocalClients(ws: WebSocket | null, data: string) {
  clients.forEach(c => {
    if (c !== ws) c.send(data)
  })
}

export function mount(app: Router) {
  app.get('/ws', [ctx => {
    if (ctx.request.headers.get('upgrade') !== 'websocket') return

    const { nick } = getSession(ctx)

    ctx.log('[ws] connecting...', nick)

    const { socket: ws, response } = Deno.upgradeWebSocket(ctx.request, {
      idleTimeout: 0
    })

    ws.onmessage = e => broadcast(ws, e)

    ws.onopen = () => {
      ctx.log('[ws] open:', nick)
      clients.add(ws)
    }

    ws.onclose = () => {
      ctx.log('[ws] close:', nick)
      clients.delete(ws)
    }

    ws.onerror = err => {
      ctx.log('[ws] error:', nick, err)
      clients.delete(ws)
    }

    return response
  }])
}
