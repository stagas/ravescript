import { logout } from '~/src/rpc/auth.ts'
import { state } from '~/src/state.ts'
import { Button } from '~/src/ui/index.ts'

export function Logout({ then }: { then?: () => void }) {
  return <Button onclick={() =>
    logout()
      .then(() => state.user = null)
      .then(() => then?.())
  }>Logout</Button>
}
