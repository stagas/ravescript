import { Sigui } from 'sigui'
import type { ChatMessage } from '~/api/chat/types.ts'
import { Channels } from '~/src/pages/Chat/Channels.tsx'
import { Messages } from '~/src/pages/Chat/Messages.tsx'
import { Users } from '~/src/pages/Chat/Users.tsx'
import { byName, byNick, hasChannel } from '~/src/pages/Chat/util.ts'
import * as actions from '~/src/rpc/chat.ts'
import { state } from '~/src/state.ts'
import { go } from '~/src/ui/Link.tsx'

export function Chat() {
  using $ = Sigui()

  const info = $({
    started: null as null | true
  })

  actions.listChannels().then(channels => {
    state.channelsList = channels.map(c => $(c)).sort(byName)
  })

  $.fx(() => {
    const { apiUrl } = state

    $()

    const chat = new EventSource(`${apiUrl}chat/events`, {
      withCredentials: true
    })

    chat.onmessage = ({ data }) => {
      const msg = JSON.parse(data) as ChatMessage

      switch (msg.type) {
        case 'started':
          info.started = true
          break

        case 'createChannel': {
          const name = msg.text
          if (hasChannel(name)) return
          state.channelsList = [...state.channelsList, $({ name })].sort(byName)
          break
        }

        case 'join':
        case 'message': {
          if (!msg.channel) return

          const channel = state.channels.find(c => c.name === msg.channel)
          if (!channel) return

          channel.messages = [...channel.messages, msg]

          if (msg.type === 'join') {
            channel.users = [...channel.users, { nick: msg.nick }].sort(byNick)
          }
        }
      }
    }

    return () => {
      chat.close()
    }
  })

  $.fx(() => {
    const { started } = $.of(info)
    const { channelsList, currentChannelName } = state
    $()
    if (!currentChannelName && channelsList.length) {
      const url = new URL(location.href)
      const channel = url.searchParams.get('channel')
      if (channel && hasChannel(channel)) {
        state.currentChannelName = channel
      }
      else {
        state.currentChannelName = channelsList[0].name
      }
    }
  })

  $.fx(() => {
    const { currentChannel } = $.of(state)
    $()
    const url = new URL('/chat', state.url)
    const searchParams = new URLSearchParams(state.search)
    url.search = searchParams.toString()
    url.searchParams.set('channel', currentChannel.name)
    go(url.href)
  })

  $.fx(() => {
    const { channels, currentChannelName } = $.of(state)
    $()
    if (channels.find(c => c.name === currentChannelName)) return
    actions.joinChannel(currentChannelName)
    actions.getChannel(currentChannelName)
      .then(channel => {
        state.channels = [...state.channels, $(channel)].sort(byName)
      })
      .catch(console.error)
  })

  return <div class="h-[calc(100vh-4rem)] flex gap-4">
    <Channels />
    <Messages />
    <Users />
  </div>
}
