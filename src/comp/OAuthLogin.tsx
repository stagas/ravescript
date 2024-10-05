import { on } from 'utils'
import { whoami } from '~/src/rpc/auth.ts'
import { state } from '~/src/state.ts'

export function OAuthLogin() {
  function oauthLogin(provider: string) {
    const h = 700
    const w = 500
    const x = window.outerWidth / 2 + window.screenX - (w / 2)
    const y = window.outerHeight / 2 + window.screenY - (h / 2)

    const url = new URL(`${location.origin}/oauth/popup`)
    url.searchParams.set('provider', provider)
    const popup = window.open(
      url,
      'oauth',
      `width=${w}, height=${h}, top=${y}, left=${x}`
    )

    if (!popup) alert('Something went wrong')

    on(window, 'storage', () => {
      popup!.close()
      if (localStorage.oauth?.startsWith('complete')) {
        whoami().then(user => state.user = user)
      }
      else {
        alert('OAuth failed.\n\nTry logging in using a different method.')
      }
    }, { once: true })
  }

  return <button onclick={() => oauthLogin('github')}>Proceed with GitHub</button>
}
