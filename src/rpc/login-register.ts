import type * as actions from '../../api/actions/login-register.ts'
import type { UserSession } from '../../api/schemas/user.ts'
import { rpcAction } from '../../lib/rpc-action.ts'
import { state } from '../state.ts'

export const login = rpcAction<typeof actions.login>('login')
export const logout = rpcAction<typeof actions.logout>('logout')
export const register = rpcAction<typeof actions.register>('register')
export const whoami = rpcAction<typeof actions.whoami>('whoami')

export function loginUser(session: UserSession) {
  state.session = session
}
