import { kv } from '../core/app.ts'
import { Context } from '../core/router.ts'
import { actions, RpcError } from '../routes/rpc.ts'
import { User } from '../schemas/user.ts'
import { sessions } from '../core/sessions.ts'

export const ADMINS = ['x']

function admins(ctx: Context) {
  const session = sessions.get(ctx)
  if (!session || !ADMINS.includes(session.nick)) {
    throw new RpcError(403, 'Forbidden')
  }
}

actions.listUsers = listUsers
export async function listUsers(ctx: Context) {
  admins(ctx)
  const users = await Array.fromAsync(kv.list<User>({ prefix: ['user'] }))
  return users.map(entry => User.parse(entry.value)).map(user => {
    // @ts-ignore remove password before sending
    delete user.password
    return user
  })
}
