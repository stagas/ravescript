import { logout } from '~/src/rpc/auth.ts'
import { state } from '~/src/state.ts'

export function logoutAction() {
  logout()
    .then(() => {
      state.user =
        state.profile =
        state.favorites =
        null
    })
}
