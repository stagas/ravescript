import { Login } from '../comp/Login.tsx'
import { Logout } from '../comp/Logout.tsx'
import { Register } from '../comp/Register.tsx'
import { state } from '../state.ts'
import { Link } from '../ui/Link.tsx'

export function Home() {
  return <div>
    {() => state.session
      ? [<div>
        Hello {state.session.nick} <Logout /> {state.session.isAdmin ? <a href="/admin/">Admin</a> : <></>} <Link href="/about">About</Link>
      </div>]
      : [<div>
        <Login />
        <Register />
      </div>
      ]
    }
  </div>
}
