import { Sigui } from 'sigui'
import { Login } from '../comp/Login.tsx'
import { Logout } from '../comp/Logout.tsx'
import { Register } from '../comp/Register.tsx'
import { env } from '../env.ts'
import { whoami } from '../rpc/login-register.ts'
import { state } from '../state.ts'

export function App() {
  using $ = Sigui()

  console.log(state.url)

  if (
    location.pathname === '/logout' &&
    location.origin !== env.VITE_API_URL
  ) {
    location.href = env.VITE_API_URL + '/logout'
    throw 'unreachable'
  }

  // `info` holds our reactive data
  const info = $({
    greet: '',
    bg: 'transparent',
    shuffle: 0,
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
