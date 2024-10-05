import { $ } from 'sigui'
import type { z } from 'zod'
import type { UiChannel } from '../api/actions/chat.ts'
import type { Channels } from '../api/models.ts'
import type { UserSession } from '../api/schemas/user.ts'
import { link } from './ui/Link.tsx'

export let state = $({
  user: undefined as undefined | null | UserSession,
  url: link.$.url,
  get pathname() {
    return state.url.pathname
  },
  channelsList: [] as Pick<z.infer<typeof Channels>, 'name'>[],
  channels: [] as UiChannel[],
  currentChannelName: null as null | string,
  get currentChannel() {
    return state.channels.find(c => c.name === state.currentChannelName)
  }
})

export function setState(newState: any) {
  state = newState
}
// const channels = ['general', 'random', 'dev']
// // const channels = Array.from({ length: 50 + (Math.random() * 50 | 0) }).map(() => loremRandomWord())
// state.channels = channels.sort().map(name => $({
//   name,
//   users: Array.from({ length: 50 + (Math.random() * 50 | 0) }).map(() => ({
//     nick: loremRandomWord(),
//   })),
//   messages: Array.from({ length: 100 }).map((_, i) => ({
//     nick: loremRandomWord(),
//     text: lorem((Math.random() ** 2.5) * 20 + 1),
//   }))
// }))

// state.currentChannelName = state.channels[0].name
