import { Sigui } from 'sigui'
import { Logout } from '../src/comp/Logout.tsx'
import { whoami } from '../src/rpc/login-register.ts'
import { listUsers } from './rpc/admin.ts'
import { state } from './state.ts'

const EDITABLE = new Set(['nick', 'email'])

export function Admin() {
  using $ = Sigui()

  const info = $({
    users: $.unwrap(listUsers)
  })

  whoami().then(session => state.session = session)

  return <div>
    {() =>
      info.users instanceof Error
        ? <div>Error! {info.users.message}</div>
        : info.users?.length
          ? <div>
            Welcome {() => state.session?.nick} <Logout then={() => location.href = '/'} /> <a href="/">Home</a>
            <h3>Users</h3>
            <table>
              <tr>
                <th>
                  <button>Delete All Users</button>
                </th>
                {Object.keys(info.users[0])
                  .map(k =>
                    <th>{k}</th>
                  )}
              </tr>
              {info.users.map(user =>
                <tr>
                  <td>
                    <button>update</button>
                    <button>delete</button>
                  </td>
                  {Object.entries(user).map(([key, value]) =>
                    <td>
                      {EDITABLE.has(key)
                        ? <input type="text" value={value} spellcheck="false" />
                        : value}
                    </td>
                  )}
                </tr>
              )}
            </table>
          </div>
          : <div>Loading users...</div>
    }
  </div>
}
