import { Sigui } from 'sigui'
import { ResetPassword } from '~/src/comp/ResetPassword.tsx'
import { VerifyEmail } from '~/src/comp/VerifyEmail.tsx'
import { About } from '~/src/pages/About.tsx'
import { Chat } from '~/src/pages/Chat/Chat.tsx'
import { Home } from '~/src/pages/Home.tsx'
import { OAuthRegister } from '~/src/pages/OAuthRegister.tsx'
import { whoami } from '~/src/rpc/auth.ts'
import { state } from '~/src/state.ts'
import { Link } from '~/src/ui/Link.tsx'

export function App() {
  using $ = Sigui()

  if (!state.user) whoami().then(user => state.user = user)

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
            const url = new URL(`${state.apiUrl}oauth/start`)
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
