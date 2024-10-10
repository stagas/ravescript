import { $, fx, storage } from 'sigui'
import type { z } from 'zod'
import type { UserSession } from '~/api/auth/types.ts'
import type { UiChannel } from '~/api/chat/types.ts'
import type { Channels } from '~/api/models.ts'
import { AnimMode } from '~/src/as/gfx/anim.ts'
import { env } from '~/src/env.ts'
import { screen } from '~/src/screen.ts'
import { link } from '~/src/ui/Link.tsx'

class State {
  // container
  container: HTMLElement | null = null
  get containerWidth(): number {
    const { width } = screen
    const { container } = this
    if (!container) return width
    const article = container.getElementsByTagName('article')[0] as HTMLElement
    const style = window.getComputedStyle(article)
    return article.getBoundingClientRect().width
      - parseFloat(style.paddingLeft)
      - parseFloat(style.paddingRight)
  }

  // url
  url: typeof link.$.url
  get pathname(): string {
    return state.url.pathname
  }
  get search(): string {
    return state.url.search
  }
  get searchParams(): URLSearchParams {
    return new URLSearchParams(this.search)
  }
  get apiUrl(): string {
    const url = new URL(env.VITE_API_URL)
    if (this.search.includes('api2')) {
      url.port = '8001'
    }
    return url.href
  }

  // app
  user?: UserSession | null

  channelsList: Pick<z.infer<typeof Channels>, 'name'>[] = []
  channels: UiChannel[] = []
  currentChannelName?: string | null

  get currentChannel(): UiChannel | undefined {
    return this.channels.find(c => c.name === this.currentChannelName)
  }

  toastMessages: { message?: string, stack?: string }[] = []

  animMode = storage(AnimMode.Auto)
  animCycle?: () => void

  constructor() {
    this.url = link.$.url
  }
}

export let state = $(new State)

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
