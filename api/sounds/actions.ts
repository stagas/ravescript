import { RouteError, type Context } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'
import { db } from '~/api/db.ts'
import { actions } from '~/api/rpc/routes.ts'

actions.post.publishSound = publishSound
export async function publishSound(ctx: Context, title: string, code: string) {
  const session = getSession(ctx)
  const { defaultProfile } = session
  if (!defaultProfile) throw new RouteError(401, 'No default profile set')

  return await db
    .insertInto('sounds')
    .values({ ownerProfileNick: defaultProfile, title, code })
    .returning('id')
    .executeTakeFirstOrThrow()
}

actions.get.listSounds = listSounds
export async function listSounds(_ctx: Context, nick: string) {
  return await db
    .selectFrom('sounds')
    .select(['id', 'title'])
    .where('ownerProfileNick', '=', nick)
    .execute()
}

actions.get.getSound = getSound
export async function getSound(_ctx: Context, id: string) {
  const sound = await db
    .selectFrom('sounds')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow()

  const creator = await db
    .selectFrom('profiles')
    .selectAll()
    .where('nick', '=', sound.ownerProfileNick)
    .executeTakeFirstOrThrow()

  return { sound, creator }
}
