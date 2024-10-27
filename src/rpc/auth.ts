import { $ } from 'sigui'
import type * as actions from '~/api/auth/actions.ts'
import type { UserSession } from '~/api/auth/types.ts'
import { rpc } from '~/lib/rpc.ts'
import { state } from '~/src/state.ts'

export const whoami = rpc<typeof actions.whoami>('POST', 'whoami')

export const login = rpc<typeof actions.login>('POST', 'login')
export const logout = rpc<typeof actions.logout>('POST', 'logout')
export const register = rpc<typeof actions.register>('POST', 'register')

export const sendVerificationEmail = rpc<typeof actions.sendVerificationEmail>('POST', 'sendVerificationEmail')
export const verifyEmail = rpc<typeof actions.verifyEmail>('POST', 'verifyEmail')

export const forgotPassword = rpc<typeof actions.forgotPassword>('POST', 'forgotPassword')
export const getResetPasswordUserNick = rpc<typeof actions.getResetPasswordUserNick>('GET', 'getResetPasswordUserNick')
export const changePassword = rpc<typeof actions.changePassword>('POST', 'changePassword')

export function loginUserSession(userSession: UserSession | null) {
  if (!userSession) throw new Error('No user session')
  state.user = userSession ? $(userSession) : userSession
}

export async function maybeLogin(orRedirect?: string) {
  if (state.user) return
  try {
    const userSession = await whoami()
    loginUserSession(userSession)
  }
  catch (error) {
    console.warn(error)
    state.user = null
    if (orRedirect) location.href = orRedirect
  }
}
