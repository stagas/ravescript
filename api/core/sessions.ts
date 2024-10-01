import type { Context } from './router.ts'
import type { UserSession } from '../schemas/user.ts'

export const sessions = new WeakMap<Context, UserSession>()
