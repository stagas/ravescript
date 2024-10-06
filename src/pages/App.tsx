import { Sigui } from 'sigui'
import { Header } from '~/src/comp/Header.tsx'
import { Logout } from '~/src/comp/Logout.tsx'
import { ResetPassword } from '~/src/comp/ResetPassword.tsx'
import { VerifyEmail } from '~/src/comp/VerifyEmail.tsx'
import { About } from '~/src/pages/About.tsx'
import { AssemblyScript } from '~/src/pages/AssemblyScript.tsx'
import { Chat } from '~/src/pages/Chat/Chat.tsx'
import { Home } from '~/src/pages/Home.tsx'
import { OAuthRegister } from '~/src/pages/OAuthRegister.tsx'
import { whoami } from '~/src/rpc/auth.ts'
import { state } from '~/src/state.ts'
import { go, Link } from '~/src/ui/Link.tsx'

export function App() {
  using $ = Sigui()

  if (!state.user) whoami().then(user => state.user = user)

  const info = $({
    bg: 'transparent',
  })

  return <main
    class="flex flex-col h-[100vh]"
    onmouseenter={() => info.bg = '#433'}
    onmouseleave={() => info.bg = 'transparent'}
  >
    <Header>
      <div class="flex items-center gap-2">
        <Link href="/">home</Link>
        <span>{() => state.url.pathname}</span>
      </div>

      <div class="flex items-center gap-2">
        <Link href={() => `/${state.user?.nick ?? ''}`}>{() => state.user?.nick}</Link>
        <Logout then={() => go('/')} />
      </div>
    </Header>

    <div class="p-3">
      {() => {
        if (state.user === undefined) return <div>Loading...</div>

        switch (state.pathname) {
          case '/':
            return <Home />

          case '/chat':
            return <Chat />

          case '/asc':
            return <AssemblyScript />

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
            return <div>
              Successfully logged in.
              You may now <button onclick={() => window.close()}>close this window</button>.
            </div>
        }
      }}
    </div>
  </main>
}
