import type * as actions from '../../api/actions/login-register.ts'
import type { UserSession } from '../../api/schemas/user.ts'
import { rpcAction } from '../../lib/rpc-action.ts'
import { state } from '../state.ts'

export const login = rpcAction<typeof actions.login>('POST', 'login')
export const logout = rpcAction<typeof actions.logout>('POST', 'logout')
export const register = rpcAction<typeof actions.register>('POST', 'register')
export const sendVerificationEmail = rpcAction<typeof actions.sendVerificationEmail>('POST', 'sendVerificationEmail')
export const verifyEmail = rpcAction<typeof actions.verifyEmail>('POST', 'verifyEmail')
export const whoami = rpcAction<typeof actions.whoami>('POST', 'whoami')
export const forgotPassword = rpcAction<typeof actions.forgotPassword>('POST', 'forgotPassword')
export const getResetPasswordUser = rpcAction<typeof actions.getResetPasswordUser>('GET', 'getResetPasswordUser')
export const changePassword = rpcAction<typeof actions.changePassword>('POST', 'changePassword')

export function loginUser(session: UserSession) {
  state.user = session
}
