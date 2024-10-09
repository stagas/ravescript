import { $, fx } from 'sigui'
import type { z } from 'zod'
import type { UserSession } from '~/api/auth/types.ts'
import type { UiChannel } from '~/api/chat/types.ts'
import type { Channels } from '~/api/models.ts'
import { env } from '~/src/env.ts'
import { screen } from '~/src/screen.ts'
import { link } from '~/src/ui/Link.tsx'

export let state = $({
  container: null as null | HTMLElement,

  url: link.$.url,
  get pathname() {
    return state.url.pathname
  },
  get search() {
    return state.url.search
  },
  get searchParams() {
    return new URLSearchParams(state.search)
  },
  get apiUrl() {
    const url = new URL(env.VITE_API_URL)
    if (state.search.includes('api2')) {
      url.port = '8001'
    }
    return url.href
  },

  user: undefined as undefined | null | UserSession,

  channelsList: [] as Pick<z.infer<typeof Channels>, 'name'>[],
  channels: [] as UiChannel[],
  currentChannelName: null as null | string,
  get currentChannel() {
    return state.channels.find(c => c.name === state.currentChannelName)
  },

  toastMessages: [] as { message?: string, stack?: string }[],
})

// fx(() => {
//   const { container } = $.of(state)
//   const { width, height } = screen
//   $()
//   container.style.width = width + 'px'
//   container.style.height = height + 'px'
// })

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
