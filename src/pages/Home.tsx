import { Login } from '~/src/comp/Login.tsx'
import { OAuthLogin } from '~/src/comp/OAuthLogin.tsx'
import { Register } from '~/src/comp/Register.tsx'
import { state } from '~/src/state.ts'
import { Link } from '~/src/ui/Link.tsx'

export function Home() {
  return <div>
    {() => state.user === undefined
      ? <div>Loading...</div>
      : state.user === null
        ?
        <div class="flex flex-col items-center">
          <div class="flex flex-col sm:flex-row flex-wrap gap-8">
            <Login />
            <span class="self-center italic">or</span>
            <Register />
          </div>

          <OAuthLogin />
        </div>
        :
        <div class="flex flex-col">
          {state.user.isAdmin && <a href="/admin/">Admin</a>}
          <Link href="/ui">UI Showcase</Link>
          <Link href="/chat">Chat</Link>
          <Link href="/ws">WebSockets</Link>
          <Link href="/canvas">Canvas</Link>
          <Link href="/webgl">WebGL</Link>
          <Link href="/editor">Editor</Link>
          <Link href="/dsp">Dsp</Link>
          <Link href="/worker-worklet">Worker-Worklet</Link>
          <Link href="/asc">AssemblyScript</Link>
          <Link href="/qrcode">QrCode</Link>
          <Link href="/create-profile">Create Profile</Link>
          <Link href="/about">About</Link>
        </div>
    }
  </div>
}
