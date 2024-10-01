import { logout } from '../rpc/login-register.ts'
import { state } from '../state.ts'

export function Logout({ then }: { then?: () => void }) {
  return <button onclick={() =>
    logout()
      .then(() => state.user = null)
      .then(() => then?.())
  }>Logout</button>
}
