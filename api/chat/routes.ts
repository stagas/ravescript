import { Router } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'

export const subs = new Map<string, ChatStream>()

export function broadcast(data: unknown) {
  for (const stream of subs.values()) {
    stream.send(data)
  }
}

class ChatStream {
  constructor(public controller: ReadableStreamDefaultController<string>) { }

  enqueue(data: string) {
    this.controller.enqueue(`data: ${data}\n\n`)
  }

  send(data: unknown) {
    this.enqueue(JSON.stringify(data))
  }
}

export function mount(app: Router) {
  app.get('/chat/events', [ctx => {
    const { nick } = getSession(ctx)

    const stream = new ReadableStream({
      start(controller) {
        const stream = new ChatStream(controller)
        subs.set(nick, stream)
        stream.send({ type: 'started', nick })
      },
      cancel() {
        subs.delete(nick)
      },
    })

    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'text/event-stream',
        'connection': 'keep-alive',
      }
    })
  }])
}
