import { colorizeNick } from '~/src/pages/Chat/util.ts'
import { state } from '~/src/state.ts'

export function Users() {
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
