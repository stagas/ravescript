import { LogOut, Menu } from 'lucide'
import { refs, Sigui, type Signal } from 'sigui'
import type { ChatMessage } from '~/api/chat/types.ts'
import { cn } from '~/lib/cn.ts'
import { icon } from '~/lib/icon.ts'
import { colorizeNick } from '~/src/pages/Chat/util.ts'
import * as actions from '~/src/rpc/chat.ts'
import { screen } from '~/src/screen.ts'
import { state } from '~/src/state.ts'
import { H3 } from '~/src/ui/Heading.tsx'

export function Messages({ showChannelsOverlay }: { showChannelsOverlay: Signal<boolean> }) {
  using $ = Sigui()

  const info = $({
    showChannelsOverlay,
  })

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

  return <div class={cn(
    'w-full pt-1.5 pb-2.5 flex flex-col max-h-[calc(100vh-4rem)]',
    { 'w-[70%]': screen.md },
  )} onclick={() => info.showChannelsOverlay = false}>
    <H3>
      <div class="flex flex-row">
        {() => screen.sm
          ?
          <button
            class="mr-2"
            onclick={ev => {
              ev.stopPropagation()
              info.showChannelsOverlay = !info.showChannelsOverlay
            }}>
            {icon(Menu)}
          </button>
          :
          <div />
        }
        <span>#{() => state.currentChannelName}</span>
      </div>
      <button class="flex items-center text-sm pr-2 gap-1" title="Leave channel">
        {icon(LogOut, { size: 16, 'stroke-width': 1.5 })}
      </button>
    </H3>

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
