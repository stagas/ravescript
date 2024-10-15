import { colorizeNick } from '~/src/pages/Chat/util.ts'
import { state } from '~/src/state.ts'
import { H3 } from '~/src/ui/Heading.tsx'
import { Link } from '~/src/ui/Link.tsx'

export function Users({ onUserClick }: {
  onUserClick(nick: string): void
}) {
  if (!state.user) return <div />

  const { nick } = state.user

  return <div class="w-[40%] max-w-56 flex flex-col gap-2 pt-1.5 pb-2.5 pl-4 ml-4 flex-grow border-l border-l-neutral-700">
    <H3>Users</H3>

    <div class="overflow-y-scroll leading-[19px]">
      {() => state.currentChannel?.users.map(user =>
        <div class="flex items-center gap-1">
          {nick !== user.nick ?
            <Link
              style={{ color: colorizeNick(user.nick) }}
              onclick={() => onUserClick(user.nick)}
            >
              {user.nick}
            </Link>
            : <span style={{ color: colorizeNick(user.nick) }}>{user.nick}</span>
          }
        </div>
      )}
    </div>
  </div>
}
