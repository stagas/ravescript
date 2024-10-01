import { kv } from '../core/app.ts'
import { Context } from '../core/router.ts'
import { sessions } from '../core/sessions.ts'
import { db } from '../db.ts'
import { actions, RpcError } from '../routes/rpc.ts'
import { UserSession } from '../schemas/user.ts'

export const ADMINS = ['x']

function admins(ctx: Context) {
  const session = sessions.get(ctx)
  if (!session || !ADMINS.includes(session.nick)) {
    throw new RpcError(403, 'Forbidden')
  }
}

async function deleteAllEntries(prefix: string[]) {
  const rows = kv.list({ prefix })
  for await (const row of rows) {
    await kv.delete(row.key)
  }
}

actions.listUsers = listUsers
export async function listUsers(ctx: Context) {
  admins(ctx)
  return await db
    .selectFrom('user')
    .select(['nick', 'email', 'createdAt', 'updatedAt'])
    .execute()
}

actions.clearUsers = clearUsers
export async function clearUsers(ctx: Context) {
  admins(ctx)
  await db.deleteFrom('user').execute()
}

actions.listSessions = listSessions
export async function listSessions(ctx: Context) {
  admins(ctx)
  const sessions = await Array.fromAsync(kv.list<UserSession>({ prefix: ['session'] }))
  return sessions.map(entry => UserSession.parse(entry.value))
    .map(session => {
      if (ADMINS.includes(session.nick)) {
        session.isAdmin = true
      }
      return session
    })
}

actions.clearSessions = clearSessions
export async function clearSessions(ctx: Context) {
  admins(ctx)
  await deleteAllEntries(['session'])
}
