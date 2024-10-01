import { Sigui } from 'sigui'
import { UserRegister } from '../../api/schemas/user.ts'
import { loginUser, register } from '../rpc/login-register.ts'
import { parseForm } from '../util/parse-form.ts'

export function Register() {
  using $ = Sigui()

  const info = $({
    error: ''
  })

  function onSubmit(ev: Event & { target: HTMLFormElement }) {
    ev.preventDefault()
    register(parseForm(ev.target, UserRegister))
      .then(loginUser)
      .catch(err => info.error = err.message)
    return false
  }

  return <form method="post" onsubmit={onSubmit}>
    <label>
      Nick <input id="nick" name="nick" required spellcheck="false" />
    </label>

    <br />

    <label>
      Email <input id="email" name="email" type="email" required />
    </label>

    <br />

    <label>
      Password <input id="password" name="password" type="password" required />
    </label>

    <br />

    <button type="submit">Register</button>

    {() => info.error}
  </form>
}
