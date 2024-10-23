import { Sigui } from 'sigui'
import { Button, go, H2, Link } from 'ui'
import type { z } from 'zod'
import type { Profiles } from '~/api/models.ts'
import { cn } from '~/lib/cn.ts'
import { DspNodeDemo } from '~/src/pages/DspNodeDemo.tsx'
import { deleteProfile, getProfile, makeDefaultProfile } from '~/src/rpc/profiles.ts'
import { listSounds } from '~/src/rpc/sounds.ts'
import { state } from '~/src/state.ts'

export function Profile() {
  using $ = Sigui()

  const info = $({
    profile: null as null | false | z.infer<typeof Profiles>,
    sounds: null as null | false | Awaited<ReturnType<typeof listSounds>>,
    get loadedSound() {
      return state.searchParams.get('sound')
    },
    get isLoadedSound() {
      return !!info.loadedSound
    },
  })

  const profileNick = state.pathname.slice(1)

  $.fx(() => {
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

  return <div>{
    () => {
      const { user } = state
      const { profile } = info
      if (profile == null) return <div>Loading profile...</div>
      else if (profile === false) return <div>404 Not Found</div>
      return <div>
        <H2>
          <span><Link href={`/${profile.nick}`}>{profile.displayName}</Link></span>

          <div>{() => user && user.nick === profile.ownerNick ?
            <div class="flex flex-row gap-2">
              <div>{() => user.defaultProfile !== profile.nick ?
                <Button onclick={async () => {
                  await makeDefaultProfile(profile.nick)
                  user.defaultProfile = profile.nick
                }}>
                  Make this my default profile
                </Button> : <div />}</div>

              <Button onclick={async () => {
                await deleteProfile(profile.nick)
                go('/settings')
              }}>Delete profile</Button>
            </div> : <div />}
          </div>
        </H2>


        <div class="flex flex-row flex-nowrap justify-stretch">{() => [
          <div class={() => info.isLoadedSound ? 'w-40' : 'w-full'}>{
            () => {
              const { sounds } = info
              if (sounds == null) return <div>Loading sounds...</div>
              else if (sounds === false) return <div>Failed to load sounds</div>
              return <div class={cn('flex flex-col gap-1', { 'items-center text-2xl': !info.isLoadedSound })}>{
                () => !sounds.length ? <div>No sounds yet.</div> : sounds.map(sound =>
                  <div class={cn('flex flex-col', { 'bg-neutral-700': sound.id === info.loadedSound })}>
                    <Link href={`/${profile.nick}?sound=${encodeURIComponent(sound.id)}`}>{sound.title}</Link>
                  </div>
                )
              }</div>
            }
          }</div>,

          info.isLoadedSound && <div class="overflow-hidden w-[90dvw] h-[84dvh]">
            {() => { $(); return <DspNodeDemo /> }}
          </div>,
        ]}</div>


      </div>
    }
  }
  </div>
}
