import { $ } from 'sigui'
import type { UserSession } from '../api/schemas/user.ts'
import { link } from './ui/Link.tsx'

export let state = $({
  user: undefined as undefined | null | UserSession,
  url: link.$.url
})

export function setState(newState: any) {
  state = newState
}
