import { UserSession } from '~/api/auth/types.ts'
import { kv } from '~/api/core/app.ts'
import { Context, RouteError } from '~/api/core/router.ts'
import { sessions } from '~/api/core/sessions.ts'
import { db } from '~/api/db.ts'
import { actions } from '~/api/rpc/routes.ts'

export const ADMINS = ['x', 'stagas']

function admins(ctx: Context) {
  const session = sessions.get(ctx)
  if (!session || !ADMINS.includes(session.nick)) {
    throw new RouteError(403, 'Forbidden')
  }
}

async function kvDeleteAllEntries(prefix: string[]) {
  const rows = kv.list({ prefix })
  for await (const row of rows) {
    await kv.delete(row.key)
  }
}

actions.get.listUsers = listUsers
export async function listUsers(ctx: Context) {
  admins(ctx)
  return (await db
    .selectFrom('users')
    .selectAll()
    .execute()
  ).map(item => {
    item.password = '✓' // mask password
    return [item.nick, item] as const
  })
}

actions.post.deleteUser = deleteUser
export async function deleteUser(ctx: Context, nick: string) {
  admins(ctx)
  return await db
    .deleteFrom('users')
    .where('nick', '=', nick)
    .executeTakeFirstOrThrow()
    .then(() => { })
}

actions.post.clearUsers = clearUsers
export async function clearUsers(ctx: Context) {
  admins(ctx)
  await db.deleteFrom('users').execute()
}

actions.get.listSessions = listSessions
export async function listSessions(ctx: Context) {
  admins(ctx)
  const sessions = await Array.fromAsync(kv.list<UserSession>({ prefix: ['session'] }))
  return sessions
    .map(entry => [
      entry.key.at(-1) as string,
      UserSession.parse(entry.value),
    ] as const)
    .map(([id, session]) => {
      if (ADMINS.includes(session.nick)) {
        session.isAdmin = true
      }
      return [id, session] as const
    })
}

actions.post.deleteSession = deleteSession
export async function deleteSession(ctx: Context, id: string) {
  admins(ctx)
  await kv.delete(['session', id])
}

actions.post.clearSessions = clearSessions
export async function clearSessions(ctx: Context) {
  admins(ctx)
  await kvDeleteAllEntries(['session'])
}
