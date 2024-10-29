import { Settings, UserCircle2 } from 'lucide'
import { dispose, Sigui } from 'sigui'
import { Button, DropDown, go, H2, H3, Link } from 'ui'
import type { z } from 'zod'
import type { Profiles } from '~/api/models.ts'
import { cn } from '~/lib/cn.ts'
import { icon } from '~/lib/icon.ts'
import { DspEditorEl } from '~/src/comp/DspEditorUi.tsx'
import { ICON_24, ICON_32 } from '~/src/constants.ts'
import { maybeLogin } from '~/src/rpc/auth.ts'
import { deleteProfile, getProfile, makeDefaultProfile } from '~/src/rpc/profiles.ts'
import { listFavorites, listSounds } from '~/src/rpc/sounds.ts'
import { state } from '~/src/state.ts'

type SoundsKind = 'sounds' | 'remixes' | 'favorites'

export function Profile() {
  using $ = Sigui()

  const info = $({
    profile: null as null | false | z.infer<typeof Profiles>,
    sounds: null as null | false | Awaited<ReturnType<typeof listSounds>>,
    favorites: null as null | false | Awaited<ReturnType<typeof listFavorites>>,
    get soundsKind(): null | SoundsKind {
      return state.searchParams.get('kind') as null | SoundsKind
    },
    get profileNick() {
      return state.pathname.slice(1)
    }
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
    sounds: null | false | Awaited<ReturnType<typeof listSounds>>
    soundsKind: string
    showCreator: boolean
  }) {
    if (sounds == null || !info.profile) return <div>Loading {soundsKind}...</div>
    else if (sounds === false) return <div>Failed to load {soundsKind}</div>
    return <div class={cn('flex flex-col gap-1', { 'text-2xl': () => !state.isLoadedSound })}>{
      () => !sounds.length ? <div>No {soundsKind} yet.</div> : sounds.map(sound => {
        const isSelected = soundsKind === info.soundsKind && sound.id === state.loadedSound
        const el = info.profile && <div class={cn('flex flex-col', { 'bg-neutral-700': isSelected })}>
          <Link
            class="overflow-hidden whitespace-nowrap overflow-ellipsis"
            href={`/${info.profile.nick}?sound=${encodeURIComponent(sound.id)}`
              + (info.profile.nick === sound.profileNick ? '' : '&creator=' + encodeURIComponent(sound.profileNick))
              + '&kind=' + soundsKind}
          >
            {() => showCreator ? <span>{sound.profileDisplayName} - </span> : <span />}{sound.title}
          </Link>
        </div>

        if (el && isSelected) {
          requestAnimationFrame(() => {
            // @ts-ignore
            (el as HTMLElement).scrollIntoViewIfNeeded({ block: 'center' })
          })
        }

        return el
      })
    }</div>
  }

  function SoundsListOfKind({ kind }: { kind: SoundsKind }) {
    return <div class="md:min-w-40">
      <H3>{kind}</H3>
      <SoundsList
        sounds={
          (kind === 'sounds'
            ? info.sounds && info.sounds.filter(sound => !sound.remixOf)
            : kind === 'remixes'
              ? info.sounds && info.sounds.filter(sound => sound.remixOf)
              : info.favorites) as any
        }
        soundsKind={kind}
        showCreator={kind === 'favorites'}
      />
    </div>
  }

  function Inner() {
    const { user } = state
    const { profile } = info
    $()
    if (profile == null) return <div>Loading profile...</div>
    else if (profile === false) return <div>404 Not Found</div>
    return <div class="relative z-0 flex w-full flex-row items-center gap-2">
      <div class={cn("flex flex-col", { 'w-full': () => !state.isLoadedSound })}>
        <H2 class="flex items-center justify-between h-16 relative">
          <div class="flex flex-row items-center h-full">
            <div class={cn(
              "min-w-40 w-40 flex-col hidden md:flex",
              { '!flex': () => !state.isLoadedSound },
            )}><Link class="text-2xl flex flex-nowrap items-center gap-1" href={() => `/${profile.nick}`}>{icon(UserCircle2, ICON_32)} {() => profile.displayName}</Link></div>
          </div>

          <div class="flex items-center">{() => user && user.nick === profile.ownerNick && <DropDown right handle={icon(Settings, ICON_24)} items={() => [
            [user.defaultProfile !== profile.nick &&
              <Button bare class="px-2 py-1" onclick={async () => {
                await makeDefaultProfile(profile.nick)
                await maybeLogin()
                user.defaultProfile = profile.nick
              }}>
                Make this my default profile
              </Button>],
            [<Button bare class="px-2 py-1" onclick={async () => {
              if (!confirm('Are you sure you want to delete this profile?\nPress OK to confirm.')) return
              await deleteProfile(profile.nick)
              go('/settings')
            }}>Delete profile</Button>],
          ]} />}</div>
        </H2>

        <div class="flex w-full">
          <div class={cn('absolute left-0 hidden lg:flex lg:relative pb-12', {
            'flex-col lg:flex-row w-full justify-center gap-y-6 gap-x-16 !flex': () => !state.isLoadedSound,
            'md:min-w-48 md:w-48 h-[calc(100vh-150px)] flex-0 flex-col md:gap-6 overflow-y-scroll': () => state.isLoadedSound
          })}>{() => [
            SoundsListOfKind({ kind: 'sounds' }),
            SoundsListOfKind({ kind: 'remixes' }),
            SoundsListOfKind({ kind: 'favorites' }),
          ]}</div>

        </div>
      </div>

      <div class="flex flex-1">{() => DspEditorEl()}</div>
    </div>
  }

  return <div>{() => <Inner />}</div>
}

