import { $ } from 'sigui'
import type { UserSession } from '../api/schemas/user.ts'

export let state = $({
  session: null as undefined | null | UserSession,
})

export function setState(newState: any) {
  state = newState
}
