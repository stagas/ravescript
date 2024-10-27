import { AudioWaveform, Plus, UserCircle } from 'lucide'
import { dispose, Sigui } from 'sigui'
import { DropDown, Layout } from 'ui'
import { dom } from 'utils'
import { CachingRouter } from '~/lib/caching-router.ts'
import { icon } from '~/lib/icon.ts'
import { Header } from '~/src/comp/Header.tsx'
import { ResetPassword } from '~/src/comp/ResetPassword.tsx'
import { Toast } from '~/src/comp/Toast.tsx'
import { VerifyEmail } from '~/src/comp/VerifyEmail.tsx'
import { ICON_24, ICON_32 } from '~/src/constants.ts'
import { About } from '~/src/pages/About.tsx'
import { AssemblyScript } from '~/src/pages/AssemblyScript.tsx'
import { CanvasDemo } from '~/src/pages/CanvasDemo'
import { Chat } from '~/src/pages/Chat/Chat.tsx'
import { CreateProfile } from '~/src/pages/CreateProfile.tsx'
import { CreateSound } from '~/src/pages/CreateSound.tsx'
import { getDspControls } from '~/src/pages/DspControls.tsx'
import { EditorDemo } from '~/src/pages/EditorDemo.tsx'
import { Home } from '~/src/pages/Home.tsx'
import { Logout } from '~/src/pages/Logout'
import { OAuthRegister } from '~/src/pages/OAuthRegister.tsx'
import { Profile } from '~/src/pages/Profile.tsx'
import { QrCode } from '~/src/pages/QrCode.tsx'
import { Settings } from '~/src/pages/Settings.tsx'
import { Showcase } from '~/src/pages/Showcase'
import { UiShowcase } from '~/src/pages/UiShowcase.tsx'
import { WebGLDemo } from '~/src/pages/WebGLDemo.tsx'
import { WebSockets } from '~/src/pages/WebSockets.tsx'
import { WorkerWorkletDemo } from '~/src/pages/WorkerWorklet/WorkerWorkletDemo'
import { maybeLogin } from '~/src/rpc/auth.ts'
import { getProfile } from '~/src/rpc/profiles.ts'
import { listFavorites } from '~/src/rpc/sounds.ts'
import { state, triggers } from '~/src/state.ts'
import { go, Link } from '~/src/ui/Link.tsx'

export function App() {
  using $ = Sigui()

  maybeLogin()

  $.fx(() => {
    const { url } = state
    $()
    state.onNavigate.forEach(fn => fn())
    state.onNavigate.clear()
  })

  $.fx(() => {
    const { user } = $.of(state)
    const { defaultProfile } = $.of(user)
    $().then(async () => {
      state.profile = $(await getProfile(defaultProfile))
    })
  })

  $.fx(() => {
    const { user } = $.of(state)
    const { defaultProfile } = $.of(user)
    $().then(async () => {
      state.favorites = new Set((await listFavorites()).map(({ id }) => id))
    })
  })

  const info = $({
    bg: 'transparent',
    canvasWidth: state.$.containerWidth,
    canvasHeight: state.$.containerHeight,
  })

  const router = CachingRouter({
    '!/': () => <Home />,
    '!/canvas': () => <CanvasDemo width={info.$.canvasWidth} height={info.$.canvasHeight} />,
    '/settings': () => <Settings />,
    '!/ws': () => <WebSockets />,
    '/about': () => <About />,
    '/asc': () => <AssemblyScript />,
    '/chat': () => <Chat />,
    '/create-profile': () => <CreateProfile />,
    '!/create-sound': () => <CreateSound />,
    '/editor': () => <EditorDemo width={info.$.canvasWidth} height={info.$.canvasHeight} />,
    '/logout': () => <Logout then={() => go('/')} />,
    '/qrcode': () => <QrCode />,
    '/reset-password': () => <ResetPassword />,
    '/showcase': () => <Showcase />,
    '/ui': () => <UiShowcase />,
    '/verify-email': () => <VerifyEmail />,
    '/webgl': () => <WebGLDemo width={info.$.canvasWidth} height={info.$.canvasHeight} />,
    '/worker-worklet': () => <WorkerWorkletDemo />,
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
      window.close()
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
      console.warn(ev)
      state.toastMessages = [...state.toastMessages, (ev as unknown as ErrorEvent)]
    }),
    dom.on(window, 'unhandledrejection', ev => {
      console.warn(ev)
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

  $.fx(() => {
    $()
    state.heading2 = () => <div class="self-center">{() => getDspControls().el}</div>
  })

  return <main
    class="flex flex-col relative"
    onmouseenter={() => info.bg = '#433'}
    onmouseleave={() => info.bg = 'transparent'}
  >
    <Toast />

    <Header>
      <div class="flex flex-row gap-12 items-center">
        <div class="flex items-center gap-2 w-40">
          <Link href="/">{icon(AudioWaveform, ICON_32)}</Link>
          <div class="leading-none">ravescript</div>
        </div>
        <div class="flex items-center -ml-1 gap-4">
          <div class="flex items-center">{() => state.heading}</div>
          <div class="flex items-center">{() => state.heading2()}</div>
        </div>
      </div>

      <div class="flex flex-row items-center gap-16">
        <div>
          <Link class="flex flex-row items-center text-lg" href="/create-sound">
            {icon(Plus, ICON_32)} <span>Create new sound</span>
          </Link>
        </div>
        <div class="flex items-center gap-2">
          <Link href={() => `/${state.user?.defaultProfile}`}>{() => state.profile?.displayName}</Link>
          <DropDown right handle={icon(UserCircle, ICON_24)} items={() => [
            [<Link class="px-4 py-0.5" href="/settings">Settings</Link>, () => { }],
            [state.user ? <Link class="px-4 py-0.5" href="/logout">Logout</Link> : <div />, () => { }],
          ]} />

        </div>
      </div>
    </Header>

    <Layout>
      <article class="p-3.5 pt-0 w-full relative">
        {() => {
          const { user, pathname } = state
          $()
          if (user === undefined) return <div>Loading...</div>

          const el = router(pathname)
          if (el) return el

          return <Profile />
        }}
      </article>
    </Layout>
  </main>
}

/*
<Link href="/">home</Link>
          <span>{() => state.url.pathname}</span>
*/
