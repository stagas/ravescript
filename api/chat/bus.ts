import { subs } from "~/api/chat/routes.ts"
import { ChatDirectMessage, ChatDirectMessageType, chatDirectMessageTypes, ChatMessage } from '~/api/chat/types.ts'
import { createBus } from '~/api/core/create-bus.ts'

export const bus = createBus(['chat', 'bus'])

bus.onmessage = ({ data }: { data: ChatMessage | ChatDirectMessage }) => {
  if (chatDirectMessageTypes.includes(data.type)) {
    const target = subs.get(data.nick)
    if (!target) return

    const msg: ChatDirectMessage = {
      type: data.type as ChatDirectMessageType,
      nick: data.from as string,
      text: data.text
    }

    target.send(msg)
  }
  else {
    for (const stream of subs.values()) stream.send(data)
  }
}
