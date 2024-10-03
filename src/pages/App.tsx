import { Sigui } from 'sigui'
import { ResetPassword } from '../comp/ResetPassword.tsx'
import { VerifyEmail } from '../comp/VerifyEmail.tsx'
import { whoami } from '../rpc/login-register.ts'
import { state } from '../state.ts'
import { About } from './About.tsx'
import { Home } from './Home.tsx'
import { OAuthRegister } from './OAuthRegister.tsx'
import { env } from '../env.ts'

export function App() {
  using $ = Sigui()

  whoami().then(user => state.user = user)

  // `info` holds our reactive data
  const info = $({
    bg: 'transparent',
  })

  return <main
    class="flex flex-col gap-1 p-3"
    onmouseenter={() => info.bg = '#433'}
    onmouseleave={() => info.bg = 'transparent'}
  >
    Page: {() => state.url.pathname}
    <br />
    {() => {
      if (state.user === undefined) return <div>Loading...</div>

      switch (state.url.pathname) {
        case '/':
          return <Home />

        case '/about':
          return <About />

        case '/verify-email':
          return <VerifyEmail />

        case '/reset-password':
          return <ResetPassword />

        case '/oauth/popup':
          const provider = state.url.searchParams.get('provider')!
          location.href = `${env.VITE_API_URL}/oauth/start?provider=${provider}&redirect_to=/`
          return <div />

        case '/oauth/register':
          return <OAuthRegister />

        case '/oauth/complete':
          // Hack: triggering a localStorage write we listen to
          // window.onstorage and we can close the popup automatically.
          localStorage.oauth = Math.random()
          return <div>Logging in...</div>
      }
    }}
  </main>
}
