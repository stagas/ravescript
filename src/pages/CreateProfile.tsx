import { Sigui } from 'sigui'
import { ProfileCreate } from '~/api/profiles/types.ts'
import * as actions from '~/src/rpc/profiles.ts'
import { state } from '~/src/state.ts'
import { Button, Fieldset, go, Input, Label } from '~/src/ui/index.ts'
import { parseForm } from '~/src/util/parse-form.ts'

export function CreateProfile() {
  using $ = Sigui()

  const info = $({
    error: ''
  })

  function createProfile(ev: Event & { target: HTMLFormElement }) {
    ev.preventDefault()
    if (!state.user) return false

    const formData = parseForm(ev.target, ProfileCreate)
    if (formData.isDefault) {
      state.user.defaultProfile = formData.nick
    }

    actions
      .createProfile(formData)
      .then(profile => go('/' + profile.nick))
      .catch(err => info.error = err.message)
    return false
  }

  return <div class="flex flex-col items-center">
    <form method="post" onsubmit={createProfile}>
      <Fieldset legend="Create New Profile">
        <Label text="Nick">
          <Input
            name="nick"
            required
            spellcheck="false"
            autocomplete="nickname"
          />
        </Label>

        <Label text="Display Name">
          <Input
            name="displayName"
            required
            spellcheck="false"
            autocomplete="name"
          />
        </Label>

        <Label text="Use as Default">
          <Input
            name="isDefault"
            type="checkbox"
          />
        </Label>

        <div class="flex flex-row items-center justify-end gap-2">
          <Button type="submit">Create</Button>
        </div>

        <span>{() => info.error}</span>
      </Fieldset>
    </form>
  </div>

}
