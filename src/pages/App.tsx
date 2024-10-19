import { Sigui } from 'sigui'
import { dom } from 'utils'
import { CachingRouter } from '~/lib/caching-router.ts'
import { Header } from '~/src/comp/Header.tsx'
import { Logout } from '~/src/comp/Logout.tsx'
import { ResetPassword } from '~/src/comp/ResetPassword.tsx'
import { Toast } from '~/src/comp/Toast.tsx'
import { VerifyEmail } from '~/src/comp/VerifyEmail.tsx'
import { About } from '~/src/pages/About.tsx'
import { AssemblyScript } from '~/src/pages/AssemblyScript.tsx'
import { CanvasDemo } from '~/src/pages/CanvasDemo'
import { Chat } from '~/src/pages/Chat/Chat.tsx'
import { DspAsyncDemo } from '~/src/pages/DspAsyncDemo.tsx'
import { DspNodeDemo } from '~/src/pages/DspNodeDemo/DspNodeDemo.tsx'
import { DspSyncDemo } from '~/src/pages/DspSyncDemo'
import { EditorDemo } from '~/src/pages/EditorDemo.tsx'
import { Home } from '~/src/pages/Home.tsx'
import { OAuthRegister } from '~/src/pages/OAuthRegister.tsx'
import { QrCode } from '~/src/pages/QrCode.tsx'
import { UiShowcase } from '~/src/pages/UiShowcase.tsx'
import { WebGLDemo } from '~/src/pages/WebGLDemo.tsx'
import { WebSockets } from '~/src/pages/WebSockets.tsx'
import { WorkerWorkletDemo } from '~/src/pages/WorkerWorklet/WorkerWorkletDemo'
import { whoami } from '~/src/rpc/auth.ts'
import { state, triggers } from '~/src/state.ts'
import { go, Link } from '~/src/ui/Link.tsx'

export function App() {
  using $ = Sigui()

  if (!state.user) whoami().then(user => state.user = user)

  const info = $({
    bg: 'transparent',
    canvasWidth: state.$.containerWidth,
    canvasHeight: state.$.containerHeight,
  })

  const router = CachingRouter({
    '/': () => <Home />,
    '/ui': () => <UiShowcase />,
    '/chat': () => <Chat />,
    '!/ws': () => <WebSockets />,
    '!/canvas': () => <CanvasDemo width={info.$.canvasWidth} height={info.$.canvasHeight} />,
    '/webgl': () => <WebGLDemo width={info.$.canvasWidth} height={info.$.canvasHeight} />,
    '/editor': () => <EditorDemo width={info.$.canvasWidth} height={info.$.canvasHeight} />,
    '/dsp-sync': () => <DspSyncDemo />,
    '/dsp-async': () => <DspAsyncDemo />,
    '/dsp-node': () => <DspNodeDemo />,
    '/worker-worklet': () => <WorkerWorkletDemo />,
    '/asc': () => <AssemblyScript />,
    '/qrcode': () => <QrCode />,
    '/about': () => <About />,
    '/verify-email': () => <VerifyEmail />,
    '/reset-password': () => <ResetPassword />,
    '/oauth/popup': () => {
      const provider = state.url.searchParams.get('provider')!
      const url = new URL(`${state.apiUrl}oauth/start`)
      url.searchParams.set('provider', provider)
      location.href = url.href
      return <div />
    },
    '/oauth/register': () => <OAuthRegister />,
    '/oauth/cancel': () => {
      localStorage.oauth = 'cancel' + Math.random()
      return <div>OAuth login cancelled</div>
    },
    '/oauth/complete': () => {
      // hack: triggering a localStorage write is how we communicate
      // to the parent window that we're done.
      localStorage.oauth = 'complete' + Math.random()
      window.close()
      return <div>
        Successfully logged in.
        You may now <button onclick={() => window.close()}>close this window</button>.
      </div>
    }
  })

  $.fx(() => [
    dom.on(window, 'error', ev => {
      state.toastMessages = [...state.toastMessages, (ev as unknown as ErrorEvent).error]
    }),
    dom.on(window, 'unhandledrejection', ev => {
      state.toastMessages = [...state.toastMessages, (ev as unknown as PromiseRejectionEvent).reason]
    }),
  ])

  $.fx(() => {
    const { user } = state
    $()
    $.flush()
    triggers.resize++
    requestAnimationFrame(() => triggers.resize++)
  })

  return <main
    class="flex flex-col relative"
    onmouseenter={() => info.bg = '#433'}
    onmouseleave={() => info.bg = 'transparent'}
  >
    <Toast />

    <Header>
      <div class="flex items-center gap-2">
        <Link href="/">home</Link>
        <span>{() => state.url.pathname}</span>
      </div>

      <div class="flex items-center gap-2">
        <Link href={() => `/${state.user?.nick ?? ''}`}>{() => state.user?.nick}</Link>
        {() => state.user ? <Logout then={() => go('/')} /> : <div />}
      </div>
    </Header>

    <article class="p-3.5">
      {() => {
        if (state.user === undefined) return <div>Loading...</div>

        const el = router(state.pathname)
        if (el) return el

        return <div>404 Not found</div>
      }}
    </article>
  </main>
}
