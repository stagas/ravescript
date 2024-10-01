import { Sigui } from 'sigui'
import { Login } from '../comp/Login.tsx'
import { Logout } from '../comp/Logout.tsx'
import { Register } from '../comp/Register.tsx'
import { env } from '../env.ts'
import { whoami } from '../rpc/login-register.ts'
import { state } from '../state.ts'

export function App() {
  using $ = Sigui()

  whoami().then(session => state.session = session)

  // `info` holds our reactive data
  const info = $({
    bg: 'transparent',
  })

  return <main
    style={() => /*css*/`
      background: ${info.bg};
      display: flex;
      flex-flow: column wrap;
      gap: 10px;
      padding: 10px;
    `}
    onmouseenter={() => info.bg = '#433'}
    onmouseleave={() => info.bg = 'transparent'}
  >
    Page: {() => state.url.pathname}
    <br />
    <div>
      {() => state.session?.nick
        ? [<div>
          Hello {state.session?.nick} <Logout /> {state.session?.isAdmin ? <a href="/admin/">Admin</a> : <></>}
        </div>]
        : [<div>
          <Login />
          <Register />
        </div>
        ]
      }
    </div>
    <br />

  </main >
}
