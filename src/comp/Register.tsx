import { Sigui } from 'sigui'
import { UserRegister } from '~/api/auth/types.ts'
import * as actions from '~/src/rpc/auth.ts'
import { Button, Fieldset, Input, Label } from '~/src/ui/index.ts'
import { parseForm } from '~/src/util/parse-form.ts'

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
    <Fieldset legend="Register">
      <Label text="Nick">
        <Input
          name="nick"
          required
          spellcheck="false"
          autocomplete="nickname"
        />
      </Label>

      <Label text="Email">
        <Input
          name="email"
          type="email"
          required
          autocomplete="email"
        />
      </Label>

      <Label text="Password">
        <Input
          name="password"
          type="password"
          required
          autocomplete="new-password"
        />
      </Label>

      <div class="flex flex-row items-center justify-end gap-2">
        <Button type="submit">Register</Button>
      </div>

      <span>{() => info.error}</span>
    </Fieldset>
  </form>
}
