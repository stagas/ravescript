import { AudioWaveform, Plus, UserCircle, UserCircle2 } from 'lucide'
import { Sigui } from 'sigui'
import { DropDown } from 'ui'
import { dom } from 'utils'
import type { z } from 'zod'
import type { Profiles } from '~/api/models.ts'
import { cn } from '~/lib/cn.ts'
import { icon } from '~/lib/icon.ts'
import { dspEditorUi } from '~/src/comp/DspEditorUi.tsx'
import { Toast } from '~/src/comp/Toast.tsx'
import { ICON_24, ICON_32, ICON_48 } from '~/src/constants.ts'
import { getDspControls } from '~/src/pages/DspControls.tsx'
import { maybeLogin } from '~/src/rpc/auth.ts'
import { getProfile, listProfilesForNick, makeDefaultProfile } from '~/src/rpc/profiles.ts'
import { listFavorites, listRecentSounds, listSounds } from '~/src/rpc/sounds.ts'
import { state, triggers } from '~/src/state.ts'
import { Link } from '~/src/ui/Link.tsx'

type SoundsKind = 'recent' | 'sounds' | 'remixes' | 'favorites'

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

  $.fx(() => {
    const { user } = $.of(state)
    const { nick } = user
    $().then(async () => {
      state.profiles = await listProfilesForNick(nick)
    })
  })

  const info = $({
    bg: 'transparent',
    canvasWidth: state.$.containerWidth,
    canvasHeight: state.$.containerHeight,
    sounds: null as null | false | Awaited<ReturnType<typeof listRecentSounds>>,
    favorites: null as null | false | Awaited<ReturnType<typeof listFavorites>>,
    profile: null as null | false | z.infer<typeof Profiles>,
    get profileNick() {
      return state.pathname.slice(1)
    },
    get soundsKind(): null | SoundsKind {
      return state.searchParams.get('kind') as null | SoundsKind
    },
  })

  $.fx(() => {
    const { profile } = info
    if (profile) return
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

  $.fx(() => {
    const { profileNick } = info
    $().then(async () => {
      try {
        info.profile = await getProfile(profileNick)
      }
      catch (error) {
        console.warn(error)
        info.profile = false
      }
    })
  })

  $.fx(() => {
    const { triggerReloadProfileSounds } = state
    const { profile } = $.of(info)
    if (profile === false) return
    $().then(async () => {
      try {
        info.sounds = await listSounds(profile.nick)
      }
      catch (error) {
        console.warn(error)
        info.sounds = false
      }
    })
  })

  $.fx(() => {
    const { triggerReloadProfileFavorites } = state
    const { profile } = $.of(info)
    if (profile === false) return
    $().then(async () => {
      try {
        info.favorites = await listFavorites(profile.nick)
      }
      catch (error) {
        console.warn(error)
        info.sounds = false
      }
    })
  })

  function SoundsList({ sounds, soundsKind, showCreator }: {
    sounds: null | false | Awaited<ReturnType<typeof listRecentSounds>>
    soundsKind: string
    showCreator: boolean
  }) {
    if (sounds === null) return <div>Loading...</div>
    else if (sounds === false) return <div>Failed to load sounds</div>
    else {
      return <div class="flex flex-col md:min-w-48 md:w-48 whitespace-nowrap">
        <div class="flex flex-col">
          {!sounds.length ? <div class="mx-2">No {soundsKind} yet.</div> : sounds.map(sound => {
            const isSelected = soundsKind === info.soundsKind && sound.id === state.loadedSound
            const el = <Link
              class={cn(
                { 'bg-neutral-700': () => isSelected },
                'overflow-hidden whitespace-nowrap overflow-ellipsis px-2'
              )}
              href={info.profile
                ? `/${info.profile.nick}?sound=${encodeURIComponent(sound.id)}`
                + `&kind=${soundsKind}`
                + (info.profile.nick === sound.profileNick ? '' : '&creator=' + encodeURIComponent(sound.profileNick))
                : `/?sound=${sound.id}`
              }
            >{() => showCreator ? <span>{sound.profileDisplayName} - </span> : <span />}{sound.title}</Link>

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

  function SoundsListOfKind({ kind }: { kind: SoundsKind }) {
    return <div class="md:min-w-40">
      <div class="mt-6 mb-4 mx-2 text-lg border-b border-b-neutral-700 flex flex-row justify-between items-center">
        <span>{kind === 'recent' ? 'Recent sounds' : kind}</span>
        {() => kind === 'recent' && <Link class="flex flex-row items-center" title="New sound" href="/create-sound">
          {icon(Plus, ICON_24)}
        </Link>}
      </div>
      <SoundsList
        sounds={
          (kind === 'recent'
            ? info.sounds
            : kind === 'sounds'
              ? info.sounds && info.sounds.filter(sound => !sound.remixOf)
              : kind === 'remixes'
                ? info.sounds && info.sounds.filter(sound => sound.remixOf)
                : info.favorites) as any
        }
        soundsKind={kind}
        showCreator={kind === 'recent' || kind === 'favorites'}
      />
    </div>
  }

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

  return <main
    class="flex flex-col relative"
    onmouseenter={() => info.bg = '#433'}
    onmouseleave={() => info.bg = 'transparent'}
  >
    <Toast />

    <div class="flex flex-row">
      <div class="flex flex-col">
        <div class="h-12 border-b border-b-neutral-500 text-xl flex items-center p-2 gap-1">
          <Link href="/">{icon(AudioWaveform, ICON_32)}</Link>
          <div class="leading-none">ravescript</div>
        </div>
        <div class=" h-[calc(100vh-80px)] overflow-y-scroll">
          <div class="flex flex-col">{() => info.profile ? [
            <div class="flex flex-col flex-nowrap justify-center items-center gap-1 mt-6 mx-2">
              <Link
                class="text-lg"
                href={() => info.profile && `/${info.profile.nick}` || ''}><span class="text-neutral-400">{icon(UserCircle2, ICON_48)}</span> {() => info.profile && info.profile.displayName}</Link>
            </div>,
            SoundsListOfKind({ kind: 'sounds' }),
            SoundsListOfKind({ kind: 'remixes' }),
            SoundsListOfKind({ kind: 'favorites' }),
          ] : [SoundsListOfKind({ kind: 'recent' })]}</div>
        </div>
      </div>
      <div class="flex flex-col flex-1">
        <div class="flex flex-row items-center justify-between border-b border-b-neutral-500 h-12 pr-2">
          <div class="flex flex-row items-center gap-2">
            <div class="flex items-center">{() => state.heading}</div>
            <div class="flex items-center">{() => getDspControls().el}</div>
          </div>
          <div class="flex items-center gap-2">
            <Link class="flex flex-row items-center text-lg mr-16" href="/create-sound">
              {icon(Plus, ICON_32)} <span>New sound</span>
            </Link>

            <Link href={() => `/${state.user?.defaultProfile}`}>{() => state.profile?.displayName}</Link>
            <DropDown right handle={icon(UserCircle, ICON_24)} items={() => [
              [<Link class="px-2 py-1 hover:no-underline flex items-center justify-end" href="/settings">Settings</Link>, () => { }],
              [state.user ? <Link class="px-2 py-1 hover:no-underline flex items-center justify-end" href="/logout">Logout</Link> : <div />, () => { }],
              ...state.profiles
                .filter(p => p.nick !== state.user?.defaultProfile)
                .map(p =>
                  [<Link class="w-32 px-2 py-1 hover:no-underline flex flex-row items-center justify-end flex-nowrap gap-1.5"
                    onclick={async () => {
                      const { user } = state
                      if (!user) return
                      await makeDefaultProfile(p.nick)
                      user.defaultProfile = p.nick
                    }}
                  >{p.displayName} {icon(UserCircle, ICON_24)}</Link>, () => { }],
                ) as any,
            ]} />
          </div>
        </div>
        <div class="flex flex-1">{() => dspEditorUi().el}</div>
      </div>
    </div>
  </main>
}

/*
<Link href="/">home</Link>
          <span>{() => state.url.pathname}</span>
*/
