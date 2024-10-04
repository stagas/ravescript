import { on } from 'utils'
import { Login } from '../comp/Login.tsx'
import { Logout } from '../comp/Logout.tsx'
import { Register } from '../comp/Register.tsx'
import { whoami } from '../rpc/login-register.ts'
import { state } from '../state.ts'
import { Link } from '../ui/Link.tsx'

export function Home() {
  function oauthLogin(provider: string) {
    const h = 700
    const w = 500
    const x = window.outerWidth / 2 + window.screenX - (w / 2)
    const y = window.outerHeight / 2 + window.screenY - (h / 2)

    const url = new URL(`${location.origin}/oauth/popup`)
    url.searchParams.set('provider', provider)
    const popup = window.open(
      url,
      'oauth',
      `width=${w}, height=${h}, top=${y}, left=${x}`
    )

    if (!popup) alert('Something went wrong')

    on(window, 'storage', () => {
      popup!.close()
      if (localStorage.oauth?.startsWith('complete')) {
        whoami().then(user => state.user = user)
      }
      else {
        alert('OAuth failed.\n\nTry logging in using a different method.')
      }
    }, { once: true })
  }

  return <div>
    {() => state.user === undefined
      ? <div>Loading...</div>
      : state.user === null
        ?
        <div>
          <Login />
          <Register />
          <button onclick={() => oauthLogin('github')}>Proceed with GitHub</button>
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
