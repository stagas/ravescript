import { Sigui } from 'sigui'
import { UserRegister } from '../../api/schemas/user.ts'
import * as actions from '../rpc/login-register.ts'
import { parseForm } from '../util/parse-form.ts'

export function Register() {
  using $ = Sigui()

  const info = $({
    error: ''
  })

  function onSubmit(ev: Event & { target: HTMLFormElement }) {
    ev.preventDefault()
    actions
      .register(parseForm(ev.target, UserRegister))
      .then(actions.loginUser)
      .catch(err => info.error = err.message)
    return false
  }

  return <form method="post" onsubmit={onSubmit}>
    <label>
      Nick <input id="nick" name="nick" required spellcheck="false" autocomplete="nickname" />
    </label>

    <br />

    <label>
      Email <input id="email" name="email" type="email" required autocomplete="email" />
    </label>

    <br />

    <label>
      Password <input id="password" name="password" type="password" required autocomplete="new-password" />
    </label>

    <br />

    <button type="submit">Register</button>

    {() => info.error}
  </form>
}
