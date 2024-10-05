import { Router } from '../core/router.ts'
import { getSession } from '../core/sessions.ts'
import { UserSession } from '../schemas/user.ts'

export const chatSubs = new Map<UserSession, ChatStream>()

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
    const session = getSession(ctx)

    const stream = new ReadableStream({
      start(controller) {
        const stream = new ChatStream(controller)
        chatSubs.set(session, stream)
        stream.send({ type: 'started', nick: session.nick })
      },
      cancel() {
        chatSubs.delete(session)
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
