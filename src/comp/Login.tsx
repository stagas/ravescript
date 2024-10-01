import { Sigui } from 'sigui'
import { UserLogin } from '../../api/schemas/user.ts'
import { login, loginUser } from '../rpc/login-register.ts'
import { parseForm } from '../util/parse-form.ts'

export function Login() {
  using $ = Sigui()

  const info = $({
    error: ''
  })

  function onSubmit(ev: Event & { target: HTMLFormElement }) {
    ev.preventDefault()
    login(parseForm(ev.target, UserLogin))
      .then(loginUser)
      .catch(err => info.error = err.message)
    return false
  }

  return <form method="post" onsubmit={onSubmit}>
    <label>
      Nick <input name="nickOrEmail" required spellcheck="false" />
    </label>

    <br />

    <label>
      Password <input name="password" type="password" required />
    </label>

    <br />

    <button type="submit">Login</button>

    {() => info.error}
  </form>
}
