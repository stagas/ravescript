import type {
  login as loginAction,
  logout as logoutAction,
  register as registerAction,
  whoami as whoamiAction
} from '../../api/actions/login-register.ts'
import type { UserSession } from '../../api/schemas/user.ts'
import { rpcAction } from '../../lib/rpc-action.ts'
import { state } from '../state.ts'

export const login = rpcAction<typeof loginAction>('login')
export const logout = rpcAction<typeof logoutAction>('logout')
export const register = rpcAction<typeof registerAction>('register')
export const whoami = rpcAction<typeof whoamiAction>('whoami')

export function loginUser(session: UserSession) {
  state.session = session
}
