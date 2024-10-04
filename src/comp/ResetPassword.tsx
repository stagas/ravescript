import { Sigui } from 'sigui'
import { UserResetPassword } from '../../api/schemas/user.ts'
import * as actions from '../rpc/login-register.ts'
import { go } from '../ui/Link.tsx'
import { parseForm } from '../util/parse-form.ts'

export function ResetPassword() {
  using $ = Sigui()

  const info = $({
    nick: null as null | string,
    error: ''
  })

  function onSubmit(ev: Event & { target: HTMLFormElement }) {
    ev.preventDefault()
    const { token, password } = parseForm(ev.target, UserResetPassword)
    actions
      .changePassword(token, password)
      .then(session => {
        go('/')
        actions.loginUser(session)
      })
      .catch(err => info.error = err.message)
    return false
  }

  const token = new URLSearchParams(location.search).get('token')
  if (!token) return <div>Token not found</div>

  actions
    .getResetPasswordUserNick(token)
    .then(nick => info.nick = nick)
    .catch(err => info.error = err.message)

  return <div>{() => info.nick ? <div>
    <h1>Reset Password</h1>

    Hello {info.nick}! Please enter your new password below:

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
