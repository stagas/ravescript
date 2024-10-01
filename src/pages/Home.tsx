import { Login } from '../comp/Login.tsx'
import { Logout } from '../comp/Logout.tsx'
import { Register } from '../comp/Register.tsx'
import { state } from '../state.ts'
import { Link } from '../ui/Link.tsx'

export function Home() {
  return <div>
    {() => state.user
      ? [<div>
        Hello {state.user.nick} <Logout /> {state.user.isAdmin ? <a href="/admin/">Admin</a> : <></>} <Link href="/about">About</Link>
      </div>]
      : [<div>
        <Login />
        <Register />
      </div>
      ]
    }
  </div>
}
