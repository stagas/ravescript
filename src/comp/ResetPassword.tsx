import { Sigui } from 'sigui'
import { UserResetPassword, type User } from '../../api/schemas/user.ts'
import * as actions from '../rpc/login-register.ts'
import { parseForm } from '../util/parse-form.ts'
import { go } from '../ui/Link.tsx'

export function ResetPassword() {
  using $ = Sigui()

  const info = $({
    user: null as User | null,
    error: ''
  })

  function onSubmit(ev: Event & { target: HTMLFormElement }) {
    ev.preventDefault()
    const { token, password } = parseForm(ev.target, UserResetPassword)
    actions
      .changePassword(token, password)
      .then(actions.loginUser)
      .then(() => go('/'))
      .catch(err => info.error = err.message)
    return false
  }

  const token = new URLSearchParams(location.search).get('token')
  if (!token) return <div>Token not found</div>

  actions
    .getResetPasswordUser(token)
    .then(user => info.user = user)
    .catch(err => info.error = err.message)

  return <div>{() => info.user ? <div>
    <h1>Reset Password</h1>

    Hello {info.user.nick}! Please enter your new password below:

    <form method="post" onsubmit={onSubmit}>
      <input type="hidden" name="token" value={token} />

      <label>
        <input name="password" type="password" required />
      </label>

      <br />

      <button type="submit">Change password</button>

      {() => info.error}
    </form></div> : info.error ? info.error : 'Loading...'}</div>
}
