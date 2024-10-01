import { $ } from 'sigui'
import type { UserSession } from '../api/schemas/user.ts'

export let state = $({
  user: null as undefined | null | UserSession,
  url: new URL(location.href),
})

export function setState(newState: any) {
  state = newState
}
