import { Sigui } from 'sigui'
import { Login } from '../comp/Login.tsx'
import { Logout } from '../comp/Logout.tsx'
import { Register } from '../comp/Register.tsx'
import { whoami } from '../rpc/login-register.ts'
import { state } from '../state.ts'
import { link } from '../ui/Link.tsx'
import { Home } from './Home.tsx'
import { About } from './About.tsx'

export function App() {
  using $ = Sigui()

  whoami().then(session => state.session = session)

  // `info` holds our reactive data
  const info = $({
    bg: 'transparent',
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
    Page: {() => link.url.pathname}
    <br />
    {() => {
      switch (link.url.pathname) {
        case '/':
          return <Home />

        case '/about':
          return <About />
      }
    }}
  </main >
}
