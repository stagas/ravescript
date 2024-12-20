import { dispose, Sigui } from 'sigui'
import type { ChatDirectMessage, ChatMessage } from '~/api/chat/types.ts'
import { Channels } from '~/src/pages/Chat/Channels.tsx'
import { Messages } from '~/src/pages/Chat/Messages.tsx'
import { Users } from '~/src/pages/Chat/Users.tsx'
import { byName, byNick, hasChannel } from '~/src/pages/Chat/util.ts'
import { VideoCall } from '~/src/pages/Chat/VideoCall.tsx'
import * as actions from '~/src/rpc/chat.ts'
import { screen } from '~/src/screen.ts'
import { state } from '~/src/state.ts'
import { go } from '~/src/ui/Link.tsx'

export interface RemoteSdp {
  type: 'webrtc:offer' | 'webrtc:answer'
  nick: string
  text: string
}

export function Chat() {
  using $ = Sigui()

  const info = $({
    started: null as null | true,

    showChannelsOverlay: false,

    videoCallType: null as null | 'offer' | 'answer',
    videoCallTargetNick: null as null | string,
    remoteSdp: null as null | RemoteSdp,
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
      const msg = JSON.parse(data) as ChatMessage | ChatDirectMessage

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
            // if user is already in channel, don't add them again
            if (channel.users.find(u => u.nick === msg.nick)) return
            channel.users = [...channel.users, { nick: msg.nick }].sort(byNick)
          }
          break
        }

        case 'directMessage': {
          alert(msg.text)
          break
        }

        case 'webrtc:offer': {
          info.remoteSdp = msg as RemoteSdp
          info.videoCallType = 'answer'
          info.videoCallTargetNick = msg.nick
          break
        }

        case 'webrtc:answer': {
          info.remoteSdp = msg as RemoteSdp
          break
        }

        case 'webrtc:end': {
          info.videoCallTargetNick = null
          break
        }
      }
    }

    return () => {
      chat.close()
    }
  })

  $.fx(() => {
    const { videoCallTargetNick } = $.of(info)
    $()
    return () => {
      actions.sendMessageToUser('webrtc:end', videoCallTargetNick)
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

  const messages = Messages({ showChannelsOverlay: info.$.showChannelsOverlay })

  const el = <div class="h-[calc(100dvh-4.5rem)] flex">
    {() => screen.md || info.showChannelsOverlay
      ? <Channels overlay={info.showChannelsOverlay} />
      : <div />
    }

    {messages.el}

    {() => screen.md ? <Users onUserClick={nick => {
      info.videoCallType = 'offer'
      info.videoCallTargetNick = nick
    }} /> : <div />}

    {() => dispose() && info.videoCallType && info.videoCallTargetNick
      ?
      <VideoCall
        type={info.$.videoCallType}
        targetNick={info.$.videoCallTargetNick}
        remoteSdp={info.$.remoteSdp} />
      :
      <div />
    }
  </div>

  return { el, focus: messages.focus }
}
