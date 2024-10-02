import { Login } from '../comp/Login.tsx'
import { Logout } from '../comp/Logout.tsx'
import { Register } from '../comp/Register.tsx'
import { state } from '../state.ts'
import { Link } from '../ui/Link.tsx'

export function Home() {
  return <div>
    {() => state.user === undefined
      ? <div>Loading...</div>
      : state.user === null
        ?
        <div>
          <Login />
          <Register />
        </div>
        :
        <div class="flex gap-2">
          <span>Hello {state.user.nick}</span>
          <Logout />
          {state.user.isAdmin && <a href="/admin/">Admin</a>}
          <Link href="/about">About</Link>
        </div>

    }
  </div>
}
