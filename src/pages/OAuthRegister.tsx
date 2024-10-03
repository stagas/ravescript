import { Sigui } from 'sigui'
import * as oauth from '../rpc/oauth.ts'
import { parseForm } from '../util/parse-form.ts'
import { z } from 'zod'

const formSchema = z.object({
  nick: z.string(),
})

export function OAuthRegister() {
  using $ = Sigui()

  const id = new URL(location.href).searchParams.get('id')
  if (!id) return <div>id not found</div>

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
        .then(() => {

        })
        .catch(error => info.error = error.message)
    }}>
      <input name="nick" value={() => info.nick} spellcheck="false" autocomplete="nickname" />
      <button type="submit">Register</button>
      <br />
      {() => info.error}
    </form>
  </div>
}
