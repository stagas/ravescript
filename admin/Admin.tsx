import { Save, Trash } from 'lucide'
import { Sigui } from 'sigui'
import { icon } from '../lib/icon.ts'
import { Logout } from '../src/comp/Logout.tsx'
import { whoami } from '../src/rpc/login-register.ts'
import { clearSessions, clearUsers, listSessions, listUsers } from './rpc/admin.ts'
import { state } from './state.ts'

const EDITABLE = new Set(['nick', 'email'])

function Table<T extends Record<string, unknown>>({
  name,
  items,
  clear,
}: {
  name: string,
  items: T[] | Error | undefined,
  clear: (...args: any[]) => any,
}) {
  return <div>
    {() =>
      items instanceof Error
        ? <div>Error! {items.message}</div>
        : items?.length
          ? <div>
            <h3>{name}</h3>
            <table class="text-nowrap">
              <tr>
                <th>
                  <button onclick={() => clear()}>Clear {name}</button>
                </th>
                {Object.keys(items[0])
                  .map(k =>
                    <th>{k}</th>
                  )}
              </tr>
              {items.map(item =>
                <tr>
                  <td>
                    <button class="p-1">{icon(Save, { size: 16, 'stroke-width': 1.5 })}</button>
                    <button class="p-1">{icon(Trash, { size: 16, 'stroke-width': 1.5 })}</button>
                  </td>
                  {Object.entries(item).map(([key, value]) =>
                    <td>
                      {EDITABLE.has(key)
                        ? <input type="text" value={value} spellcheck="false" />
                        : typeof value === 'boolean'
                          ? value ? '✓' : '✗'
                          : value}
                    </td>
                  )}
                </tr>
              )}
            </table>
          </div>
          : <div>Loading {name}...</div>
    }
  </div>
}

export function Admin() {
  using $ = Sigui()

  const info = $({
    users: $.unwrap(listUsers),
    sessions: $.unwrap(listSessions),
  })

  whoami().then(user => state.user = user)

  return <div class="p-2">
    Welcome {() => state.user?.nick} <Logout then={() => location.href = '/'} /> <a href="/">Home</a>

    {() =>
      <Table
        name="Users"
        items={info.users}
        clear={() => confirm('Clear users?') && clearUsers().then(() => {
          info.users = []
        })}
      />}

    {() =>
      <Table
        name="Sessions"
        items={info.sessions}
        clear={() => confirm('Clear sessions?') && clearSessions().then(() => {
          info.sessions = []
        })}
      />}
  </div>
}
