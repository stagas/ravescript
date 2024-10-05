import { RouteError, type Context } from './router.ts'
import type { UserSession } from '../schemas/user.ts'

export const sessions = new WeakMap<Context, UserSession>()

export function getSession(ctx: Context) {
  const session = sessions.get(ctx)
  if (!session) throw new RouteError(401, 'Session not found')
  return session
}
