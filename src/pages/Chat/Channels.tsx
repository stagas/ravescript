import { Plus } from 'lucide'
import { Sigui } from 'sigui'
import { defer } from 'utils'
import type { UiChannel } from '~/api/chat/types.ts'
import { cn } from '~/lib/cn.ts'
import { icon } from '~/lib/icon.ts'
import * as actions from '~/src/rpc/chat.ts'
import { state } from '~/src/state.ts'
import { byName, hasChannel } from './util.ts'
import { H3 } from '~/src/ui/Heading.tsx'

export function Channels({ overlay = true }: { overlay?: boolean }) {
  using $ = Sigui()
  return <div class={cn(
    "w-[30%] max-w-56 flex flex-col gap-2 pt-1.5 pb-2.5 pr-4 mr-4 flex-shrink-0 border-r border-r-neutral-700",
    { 'absolute bg-neutral-900 h-[calc(100vh-4.5rem)]': overlay },
  )}>
    <H3>
      <span>Channels</span>
      <button class="flex items-center text-sm pr-2 gap-1"
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
        {icon(Plus, { size: 16, 'stroke-width': 1.5 })}
      </button>
    </H3>

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
