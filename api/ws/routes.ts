import { createBus } from '~/api/core/create-bus.ts'
import type { Router } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'

const clients = new Set<WebSocket>()

const bus = createBus(['ws'])
bus.onmessage = event => sendToLocalClients(event.data)

function broadcast(this: WebSocket, { data }: { data: string }) {
  bus.postMessage(data)
  sendToLocalClients(data, this)
}

function sendToLocalClients(data: string, socket?: WebSocket) {
  clients.forEach(client => {
    if (client !== socket) client.send(data)
  })
}

export function mount(app: Router) {
  app.get('/ws', [ctx => {
    if (ctx.request.headers.get('upgrade') !== 'websocket') return

    const { nick } = getSession(ctx)

    ctx.log('[ws] connecting...', nick)

    const { response, socket: ws } = Deno.upgradeWebSocket(ctx.request, {
      idleTimeout: 0
    })

    ws.onmessage = broadcast

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
