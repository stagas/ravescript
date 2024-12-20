import { Save, Trash } from 'lucide'
import { Sigui } from 'sigui'
import * as actions from '~/admin/rpc/admin.ts'
import { state } from '~/admin/state.ts'
import { icon } from '~/lib/icon.ts'
import { Header } from '~/src/comp/Header.tsx'
import { loginUserSession, maybeLogin, whoami } from '~/src/rpc/auth.ts'

const EDITABLE = new Set(['nick', 'email'])

function Table<T extends readonly [string, Record<string, unknown>]>({
  name,
  list,
  del,
  clear,
}: {
  name: string,
  list: () => Promise<T[] | Error | undefined>,
  del: (key: string) => any,
  clear: (...args: any[]) => any,
}) {
  using $ = Sigui()

  const info = $({
    items: [] as T[] | Error | undefined
  })

  async function refresh() {
    try {
      info.items = await list()
    }
    catch (error) {
      if (error instanceof Error) {
        info.items = error
      }
    }
  }

  refresh()

  return <div>
    {() =>
      info.items instanceof Error
        ? <div>Error! {info.items.message}</div>
        : info.items?.length
          ? <div>
            <h3>{name}</h3>
            <table class="text-nowrap">
              <tr>
                <th>
                  <button onclick={() => confirm(`Clear ${name}?`) && clear().then(refresh)}>Clear {name}</button>
                </th>
                <th>key</th>
                {Object.keys(info.items[0][1])
                  .map(k =>
                    <th>{k}</th>
                  )}
              </tr>
              {info.items.map(([key, item]) =>
                <tr>
                  <td>
                    <button class="p-1">{icon(Save, { size: 16, 'stroke-width': 1.5 })}</button>
                    <button class="p-1" onclick={() => confirm(`Delete ${key}?`) && del(key).then(refresh)}>{icon(Trash, { size: 16, 'stroke-width': 1.5 })}</button>
                  </td>
                  <td>{key}</td>
                  {Object.entries(item).map(([key, value]) =>
                    <td>
                      {EDITABLE.has(key)
                        ? <input type="text" value={value} spellcheck="false" />
                        : typeof value === 'boolean'
                          ? value ? '✓' : ''
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
  maybeLogin('/')
  return <div>
    <Header>
      <div class="flex items-center gap-2">
        <a href="/">home</a>
        <span>{() => state.url.pathname}</span>
      </div>

      <div class="flex items-center gap-2">
        <span>{state.user?.nick}</span>

      </div>
    </Header>

    <div class="p-3">
      {() =>
        <Table
          name="Users"
          list={actions.listUsers}
          del={actions.deleteUser}
          clear={actions.clearUsers}
        />}

      {() =>
        <Table
          name="Sessions"
          list={actions.listSessions}
          del={actions.deleteSession}
          clear={actions.clearSessions}
        />}
    </div>
  </div>
}
