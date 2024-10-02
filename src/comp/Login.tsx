import { refs, Sigui } from 'sigui'
import { UserLogin } from '../../api/schemas/user.ts'
import * as actions from '../rpc/login-register.ts'
import { parseForm } from '../util/parse-form.ts'

export function Login() {
  using $ = Sigui()

  const info = $({
    error: ''
  })

  function onSubmit(ev: Event & { target: HTMLFormElement, submitter: HTMLElement }) {
    ev.preventDefault()
    const userLogin = parseForm(ev.target, UserLogin)

    if (ev.submitter === refs.forgot) {
      actions
        .forgotPassword(userLogin.nickOrEmail)
        .then(() => {
          alert('Check your email for a password reset link.')
        })
    }
    else {
      actions.login(userLogin)
        .then(actions.loginUser)
        .catch(err => info.error = err.message)
    }
    return false
  }

  return <form method="post" onsubmit={onSubmit}>
    <label>
      Nick or Email <input name="nickOrEmail" required spellcheck="false" autocomplete="nickname" />
    </label>

    <br />

    <label>
      Password <input name="password" type="password" required autocomplete="current-password" />
    </label>

    <br />

    <button type="submit">Login</button>

    <button ref="forgot" type="submit">Forgot password</button>

    {() => info.error}
  </form>
}
