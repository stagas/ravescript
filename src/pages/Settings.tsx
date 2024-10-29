import { Sigui } from 'sigui'
import { H2, H3, Link } from 'ui'
import type { z } from 'zod'
import type { Profiles } from '~/api/models.ts'
import { listProfilesForNick } from '~/src/rpc/profiles.ts'
import { state } from '~/src/state.ts'

export function Settings() {
  using $ = Sigui()

  const info = $({
    profiles: [] as z.infer<typeof Profiles>[],
  })

  $.fx(() => {
    const { user } = $.of(state)
    const { nick } = user
    $().then(async () => {
      info.profiles = await listProfilesForNick(nick)
    })
  })

  return <div>
    <H2>Settings Page</H2>

    <div>
      <H3>
        <span>Profiles</span>
        <div>
          <Link href="/create-profile">Create New Profile</Link>
        </div>
      </H3>
      <div>{
        () => info.profiles.map(profile => <div>
          <Link href={`/${profile.nick}`}>
            {() => profile.displayName} {() => state.user && profile.nick === state.user.defaultProfile ? '(default)' : ''}
          </Link>
        </div>)
      }</div>
    </div>
  </div>
}
