import { createBus } from '~/api/core/create-bus.ts'
import { RouteError, Router } from '~/api/core/router.ts'

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
    const { socket: ws, response } = Deno.upgradeWebSocket(ctx.request, {
      idleTimeout: 0
    })

    ws.onmessage = e => broadcast(ws, e)
    ws.onopen = () => clients.add(ws)
    ws.onclose = () => clients.delete(ws)
    ws.onerror = err => {
      ctx.log('[ws] error:', err)
      clients.delete(ws)
    }
    return response
  }])
}
