import { Sigui } from 'sigui'
import { H2 } from 'ui'
import { cn } from '~/lib/cn.ts'
import { dspEditorUi } from '~/src/comp/DspEditorUi.tsx'
import { Login } from '~/src/comp/Login.tsx'
import { OAuthLogin } from '~/src/comp/OAuthLogin.tsx'
import { Register } from '~/src/comp/Register.tsx'
import { listRecentSounds } from '~/src/rpc/sounds.ts'
import { state } from '~/src/state.ts'
import { Link } from '~/src/ui/Link.tsx'

let _home: ReturnType<typeof Home>
export function home() {
  _home ??= Home()
  return _home
}

export function Home() {
  using $ = Sigui()

  const info = $({
    sounds: null as null | false | Awaited<ReturnType<typeof listRecentSounds>>,
  })

  $.fx(() => {
    $().then(async () => {
      try {
        info.sounds = await listRecentSounds()
      }
      catch (error) {
        console.warn(error)
        info.sounds = false
      }
    })
  })

  function SoundsList() {
    const { sounds } = info
    if (sounds === null) return <div>Loading...</div>
    else if (sounds === false) return <div>Failed to load sounds</div>
    else {
      return <div class={cn(
        "md:min-w-48 md:w-48 h-[calc(100vh-135px)] overflow-y-scroll whitespace-nowrap",
        { '!w-full text-xl': () => !state.isLoadedSound },
        { 'flex flex-col': () => state.isLoadedSound },
      )}>
        <div class={cn({
          'grid sm:grid-cols-2 md:grid-cols-3 gap-x-6': () => !state.isLoadedSound,
          "flex flex-col": () => state.isLoadedSound,
        })}>
          {sounds.map(sound => {
            const isSelected = sound.id === state.loadedSound
            const el = <Link class={cn(
              { 'bg-neutral-700': () => isSelected },
              "overflow-hidden whitespace-nowrap overflow-ellipsis")} href={`/?sound=${sound.id}`}>{sound.profileDisplayName} - {sound.title}</Link>

            if (isSelected) {
              requestAnimationFrame(() => {
                // @ts-ignore
                (el as HTMLElement).scrollIntoViewIfNeeded({ block: 'center' })
              })
            }

            return el
          })}
        </div>
      </div>
    }
  }

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
        <div class="pt-1.5 flex flex-row w-full gap-2">
          <div class={cn({ 'w-full': () => !state.isLoadedSound })}>
            <H2 class="flex h-16 relative">
              <span class="w-48 text-2xl leading-none">{() => state.isLoadedSound ? <span>Recent<br />sounds</span> : <span>Recent sounds</span>}</span>
            </H2>
            <SoundsList />
          </div>

          <div class="flex flex-1">{() => dspEditorUi().el}</div>
        </div>
    }
  </div>
}
