import { logout } from '~/src/rpc/auth.ts'
import { state } from '~/src/state.ts'

export function Logout({ then }: { then?: () => void }) {
  logout()
    .then(() => state.user = null)
    .then(() => then?.())

  return <div>Logging you out...</div>
}
