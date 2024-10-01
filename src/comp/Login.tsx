import { Sigui } from 'sigui'
import { login, loginUser } from '../rpc/login-register.ts'
import { UserLogin } from '../../api/schemas/user.ts'

export function Login() {
  using $ = Sigui()

  const info = $({
    error: ''
  })

  function onSubmit(ev: Event) {
    ev.preventDefault()
    const form = new FormData(ev.target as HTMLFormElement)
    const data = UserLogin.parse(Object.fromEntries(form.entries()))
    login(data)
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
