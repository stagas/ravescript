import { Sigui } from 'sigui'
import { z } from 'zod'
import * as oauth from '~/src/rpc/oauth.ts'
import { go } from '~/src/ui/Link.tsx'
import { parseForm } from '~/src/util/parse-form.ts'

const formSchema = z.object({
  nick: z.string(),
})

export function OAuthRegister() {
  using $ = Sigui()

  const id = new URL(location.href).searchParams.get('id')
  if (!id) return <div>OAuth session id not found</div>

  const info = $({
    nick: undefined as undefined | string,
    error: null as null | string
  })

  oauth.getLoginSession(id).then(loginSession => {
    info.nick = loginSession.login
  })

  return <div>
    Pick a nick:

    <form onsubmit={ev => {
      ev.preventDefault()
      const { nick } = parseForm(ev.target as HTMLFormElement, formSchema)
      oauth.registerOAuth(id, nick)
        .then(() => go('/oauth/complete'))
        .catch(error => info.error = error.message)
    }}>
      <input name="nick" value={() => info.nick} spellcheck="false" required autocomplete="nickname" />
      <button type="submit">Register</button>
      <br />
      {() => info.error}
    </form>
  </div>
}
