import { Sigui } from 'sigui'
import { ResetPassword } from '../comp/ResetPassword.tsx'
import { VerifyEmail } from '../comp/VerifyEmail.tsx'
import { env } from '../env.ts'
import { whoami } from '../rpc/login-register.ts'
import { state } from '../state.ts'
import { About } from './About.tsx'
import { Chat } from './Chat.tsx'
import { Home } from './Home.tsx'
import { OAuthRegister } from './OAuthRegister.tsx'
import { Link } from '../ui/Link.tsx'

export function App() {
  using $ = Sigui()

  whoami().then(user => state.user = user)

  // `info` holds our reactive data
  const info = $({
    bg: 'transparent',
  })

  return <main
    class="flex flex-col h-[100vh]"
    onmouseenter={() => info.bg = '#433'}
    onmouseleave={() => info.bg = 'transparent'}
  >
    <header class="h-10 p-3.5 bg-black flex items-center gap-2">
      <Link href="/">home</Link>
      <span>{() => state.url.pathname}</span>
    </header>

    <div class="p-3">
      {() => {
        if (state.user === undefined) return <div>Loading...</div>

        switch (state.pathname) {
          case '/':
            return <Home />

          case '/chat':
            return <Chat />

          case '/about':
            return <About />

          case '/verify-email':
            return <VerifyEmail />

          case '/reset-password':
            return <ResetPassword />

          case '/oauth/popup': {
            const provider = state.url.searchParams.get('provider')!
            const url = new URL(`${env.VITE_API_URL}/oauth/start`)
            url.searchParams.set('provider', provider)
            location.href = url.href
            return <div />
          }

          case '/oauth/register':
            return <OAuthRegister />

          case '/oauth/cancel':
            localStorage.oauth = 'cancel' + Math.random()
            return <div>OAuth login cancelled</div>

          case '/oauth/complete':
            // Hack: triggering a localStorage write we listen to
            // window.onstorage and we can close the popup automatically.
            localStorage.oauth = 'complete' + Math.random()
            return <div>Logging in...</div>
        }
      }}
    </div>
  </main>
}
