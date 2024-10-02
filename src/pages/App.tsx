import { Sigui } from 'sigui'
import { ResetPassword } from '../comp/ResetPassword.tsx'
import { VerifyEmail } from '../comp/VerifyEmail.tsx'
import { whoami } from '../rpc/login-register.ts'
import { state } from '../state.ts'
import { About } from './About.tsx'
import { Home } from './Home.tsx'

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
      switch (state.url.pathname) {
        case '/':
          return <Home />

        case '/about':
          return <About />

        case '/verify-email':
          return <VerifyEmail />

        case '/reset-password':
          return <ResetPassword />
      }
    }}
  </main>
}
