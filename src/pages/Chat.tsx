import { LogOut, Plus } from 'lucide'
import { refs, Sigui } from 'sigui'
import type { ChatMessage, UiChannel } from '../../api/actions/chat.ts'
import { cn } from '../../lib/cn.ts'
import { icon } from '../../lib/icon.ts'
import { env } from '../env.ts'
import * as actions from '../rpc/chat.ts'
import { state } from '../state.ts'
import { defer } from 'utils'
import { go } from '../ui/Link.tsx'

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name)
}

function byNick(a: { nick: string }, b: { nick: string }) {
  return a.nick.localeCompare(b.nick)
}

function colorizeNick(nick: string = '') {
  const hash = [...nick].reduce((acc, char) => char.charCodeAt(0) + acc, 0)
  const hue = hash % 360
  return `hsl(${hue}, 60%, 55%)`
}

function Channels() {
  using $ = Sigui()
  return <div class="w-[30%] max-w-56 flex flex-col gap-2 pt-1.5 pb-2.5 flex-shrink-0">
    <h3 class="min-h-9 flex items-center justify-between border-b border-neutral-600">
      <span>Channels</span>
      <button class="flex items-center text-sm pr-4 gap-1"
        onclick={async () => {
          const batchEnd = $.batch()
          using _ = defer(batchEnd)

          const name = prompt('Enter channel name')
          if (!name) return
          if (state.channelsList.find(channel => channel.name === name)) {
            alert('Channel already exists. Please choose another name.')
            return
          }
          try {
            await actions.createChannel(name)
          }
          catch (error) {
            if (error instanceof Error) {
              alert(error.message)
              return
            }
            else throw error
          }
          if (!hasChannel(name)) {
            const channel = $({ name, users: [state.user], messages: [] }) as UiChannel
            state.channels = [...state.channels, channel].sort(byName)
            state.channelsList = [...state.channelsList, $({ name })].sort(byName)
          }
          state.currentChannelName = name
        }}
      >
        {icon(Plus, { size: 16, 'stroke-width': 1.5 })} new
      </button>
    </h3>

    <div class="flex flex-col overflow-y-scroll leading-[19px]">
      {() => state.channelsList.map(channel => {
        const isCurrent = state.currentChannelName === channel.name
        const el = <button
          class={cn(
            'text-left border-none cursor-pointer hover:bg-neutral-700',
            { 'bg-neutral-900': !isCurrent },
            { 'bg-neutral-800': isCurrent },
          )}
          onpointerdown={() => state.currentChannelName = channel.name}
        >
          {channel.name}
        </button>
        if (isCurrent) {
          requestAnimationFrame(() => {
            el.scrollIntoView({ block: 'center' })
          })
        }
        return el
      }
      )}
    </div>
  </div>
}

function Messages() {
  using $ = Sigui()

  $.fx(() => {
    const { currentChannel } = $.of(state)
    const { messages } = currentChannel
    $()
    requestAnimationFrame(() => {
      refs.chatMessages.scrollTo({
        top: refs.chatMessages.scrollHeight,
        behavior: 'instant',
      })

      const input = refs.chatInput as HTMLInputElement
      input.focus()
    })
  })

  function sendMessage() {
    if (!state.currentChannel || !state.currentChannelName) return

    const input = refs.chatInput as HTMLInputElement

    const message: ChatMessage = {
      type: 'message',
      channel: state.currentChannelName,
      nick: state.user!.nick,
      text: input.value,
    }
    actions.sendMessageToChannel('message', state.currentChannelName, message.text)

    state.currentChannel.messages = [
      ...state.currentChannel.messages,
      message
    ]

    input.value = ''
  }

  const emptyMsg: ChatMessage[] = [{ type: 'message', nick: '', text: '' }]

  return <div class="w-[70%] pt-1.5 pb-2.5 pl-4 border-l border-l-neutral-700 flex flex-col max-h-[calc(100vh-4rem)]">
    <h3 class="min-h-9 flex items-center border-b border-neutral-600 justify-between">
      <span>#{() => state.currentChannelName}</span>
      <button class="flex items-center text-sm pr-2 gap-1" title="Leave channel">
        {icon(LogOut, { size: 16, 'stroke-width': 1.5 })}
      </button>
    </h3>

    <div ref="chatMessages" class="overflow-y-scroll leading-[19px]">
      <div class="flex flex-col justify-end min-h-[calc(100vh-8.75rem)]">
        {() => emptyMsg.concat(state.currentChannel?.messages ?? []).concat(emptyMsg).map(message =>
          <div class="flex gap-1.5">
            <span class="font-bold min-w-[20%] max-w-[20%] text-right pr-1.5 border-r border-neutral-600" style={{ color: colorizeNick(message.nick) }}>{message.nick}</span>
            <span class={cn({ 'italic text-neutral-500': message.type !== 'message' })}>{message.type === 'join' ? 'joined #' + state.currentChannelName : message.text}{!message.text.length && <>&nbsp;</>}</span>
          </div>
        )}
      </div>
    </div>
    <div class="flex flex-row items-center gap-1">
      <span class="font-bold" style={{ color: colorizeNick(state.user?.nick) }}>{() => state.user?.nick}</span>
      <input ref="chatInput" type="text" class="w-full"
        onkeydown={e => e.key === 'Enter' && sendMessage()}
      />
    </div>
  </div>
}

function Users() {
  return <div class="w-[30%] max-w-56 flex flex-col gap-2 pt-1.5 pb-2.5 pl-4 flex-grow border-l border-l-neutral-700">
    <h3 class="min-h-9 flex items-center border-b border-neutral-600">Users</h3>

    <div class="overflow-y-scroll leading-[19px]">
      {() => state.currentChannel?.users.map(user =>
        <div class="flex items-center gap-1">
          <span style={{ color: colorizeNick(user.nick) }}>{user.nick}</span>
        </div>
      )}
    </div>
  </div>
}

function hasChannel(channelName: string) {
  return state.channelsList.find(c => c.name === channelName)
}

export function Chat() {
  using $ = Sigui()

  const info = $({
    started: null as null | true
  })

  actions.listChannels().then(channels =>
    state.channelsList = channels.map(c => $(c)).sort(byName)
  )

  const chat = new EventSource(`${env.VITE_API_URL}/chat`, {
    withCredentials: true
  })
  chat.onmessage = ({ data }) => {
    const msg = JSON.parse(data) as ChatMessage
    console.log('RECEIVE', msg)
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

      // case 'join': {
      //   const channel = state.channels.find(c => c.name === msg.channel)
      //   if (!channel) return
      //   channel.users = [...channel.users, { nick: msg.nick }].sort(byNick)
      // }
    }
  }
  $.fx(() => () => {
    chat.close()
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
    go('/chat?channel=' + currentChannel.name)
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
