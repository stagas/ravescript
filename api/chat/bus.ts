import { subs } from "~/api/chat/routes.ts"
import { createBus } from '~/api/core/create-bus.ts'

export const bus = createBus(['chat', 'bus'])

bus.onmessage = ({ data }) => {
  for (const stream of subs.values()) stream.send(data)
}
