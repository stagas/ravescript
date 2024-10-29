import { db } from '~/api/db.ts'
import { actions } from '~/api/rpc/routes.ts'
import { RouteError, type Context } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'
import { Profiles } from '~/api/models.ts'
import type { ProfileCreate } from '~/api/profiles/types.ts'
import { loginUser } from '~/api/auth/actions.ts'

actions.post.createProfile = createProfile
export async function createProfile(ctx: Context, data: ProfileCreate) {
  const session = getSession(ctx)
  const { nick: ownerNick } = session

  const result = await db
    .insertInto('profiles')
    .values({
      ownerNick,
      nick: data.nick,
      displayName: data.displayName
    })
    .returning('nick')
    .executeTakeFirstOrThrow()

  if (data.isDefault || session.defaultProfile == null) {
    await makeDefaultProfile(ctx, data.nick)
  }

  return result
}

actions.post.makeDefaultProfile = makeDefaultProfile
export async function makeDefaultProfile(ctx: Context, nick: string) {
  const session = getSession(ctx)
  const { nick: ownerNick } = session

  await db
    .updateTable('users')
    .set({ defaultProfile: nick })
    .where('nick', '=', ownerNick)
    .returning('defaultProfile')
    .executeTakeFirstOrThrow()

  return loginUser(ctx, ownerNick)
}

actions.get.getProfile = getProfile
export async function getProfile(_ctx: Context, nick: string) {
  return await db
    .selectFrom('profiles')
    .selectAll()
    .where('nick', '=', nick)
    .executeTakeFirstOrThrow()
}

actions.get.listProfilesForNick = listProfilesForNick
export async function listProfilesForNick(_ctx: Context, nick: string) {
  return (await db
    .selectFrom('profiles')
    .selectAll()
    .where('ownerNick', '=', nick)
    .execute()
  ).map(entry => Profiles.parse(entry))
}

actions.post.deleteProfile = deleteProfile
export async function deleteProfile(ctx: Context, nick: string) {
  const session = getSession(ctx)
  const { nick: owner, defaultProfile } = session

  if (nick === defaultProfile) throw new RouteError(400, 'Cannot delete default profile')

  return await db
    .deleteFrom('profiles')
    .where('ownerNick', '=', owner)
    .where('nick', '=', nick)
    .returning('nick')
    .executeTakeFirstOrThrow()
}
