import { Sigui } from 'sigui'
import { UserForgot, UserLogin } from '../../api/schemas/user.ts'
import * as actions from '../rpc/login-register.ts'
import { parseForm } from '../util/parse-form.ts'
import { Link } from '../ui/Link.tsx'
import { Fieldset, Input, Label } from '../ui/index.ts'

export function Login() {
  using $ = Sigui()

  const info = $({
    mode: 'login' as 'login' | 'forgot',
    forgotEmail: null as null | string,
    error: ''
  })

  function submitLogin(ev: Event & { target: HTMLFormElement, submitter: HTMLElement }) {
    ev.preventDefault()
    const userLogin = parseForm(ev.target, UserLogin)
    actions
      .login(userLogin)
      .then(actions.loginUser)
      .catch(err => info.error = err.message)
    return false
  }

  function submitForgot(ev: Event & { target: HTMLFormElement, submitter: HTMLElement }) {
    ev.preventDefault()
    const userForgot = parseForm(ev.target, UserForgot)
    actions
      .forgotPassword(userForgot.email)
      .then(() => {
        info.forgotEmail = userForgot.email
      })
    return false
  }

  return <div>
    {() => {
      switch (info.mode) {
        case 'login':
          return <form method="post" onsubmit={submitLogin}>
            <Fieldset legend="Login">
              <Label text="Nick or Email">
                <Input
                  name="nickOrEmail"
                  required
                  spellcheck="false"
                  autocomplete="nickname"
                />
              </Label>

              <Label text="Password">
                <Input
                  name="password"
                  type="password"
                  required
                  autocomplete="current-password"
                />
              </Label>

              <div class="flex flex-row items-center justify-end gap-2">
                <Link onclick={() => info.mode = 'forgot'}>Forgot password</Link>
                <button type="submit">Login</button>
              </div>

              <span>{() => info.error}</span>
            </Fieldset>

          </form>

        case 'forgot':
          if (info.forgotEmail) {
            const site = `https://${info.forgotEmail.split('@')[1]}`
            return <div>Done! <a href={site}>Check your email</a> for a reset password link.</div>
          }
          else {
            return <form method="post" onsubmit={submitForgot}>
              <Fieldset legend="Forgot Password">
                <Label text="Email">
                  <Input
                    name="email"
                    type="email"
                    required
                    spellcheck="false"
                    autocomplete="email"
                  />
                </Label>

                <div class="flex flex-row items-center justify-end gap-2">
                  <span><Link onclick={() => info.mode = 'login'}>Login using password</Link></span>
                  <button type="submit">Send reset link</button>
                </div>

                <span>{() => info.error}</span>
              </Fieldset>
            </form>
          }
      }
    }}
  </div>
}
