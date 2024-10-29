import { RouteError, type Context } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'
import { db } from '~/api/db.ts'
import { actions } from '~/api/rpc/routes.ts'
import { Sounds, Profiles } from '~/api/models.ts'
import type { z } from 'zod'

actions.post.publishSound = publishSound
export async function publishSound(ctx: Context, title: string, code: string, remixOf?: string) {
  const session = getSession(ctx)
  const { defaultProfile } = session
  if (!defaultProfile) throw new RouteError(401, 'No default profile set')

  return await db
    .insertInto('sounds')
    .values({ ownerProfileNick: defaultProfile, title, code, remixOf })
    .returning('id')
    .executeTakeFirstOrThrow()
}

actions.post.overwriteSound = overwriteSound
export async function overwriteSound(ctx: Context, id: string, title: string, code: string) {
  const session = getSession(ctx)
  const { defaultProfile } = session
  if (!defaultProfile) throw new RouteError(401, 'No default profile set')

  await db
    .updateTable('sounds')
    .set({ title, code })
    .where('id', '=', id)
    .where('ownerProfileNick', '=', defaultProfile)
    .executeTakeFirstOrThrow()
}

actions.post.deleteSound = deleteSound
export async function deleteSound(ctx: Context, id: string) {
  const session = getSession(ctx)
  const { defaultProfile } = session
  if (!defaultProfile) throw new RouteError(401, 'No default profile set')

  await db
    .deleteFrom('sounds')
    .where('id', '=', id)
    .where('ownerProfileNick', '=', defaultProfile)
    .executeTakeFirstOrThrow()
}

actions.get.listSounds = listSounds
export async function listSounds(_ctx: Context, nick: string) {
  return await db
    .selectFrom('sounds')
    .innerJoin('profiles', 'sounds.ownerProfileNick', 'profiles.nick')
    .select(['sounds.id', 'sounds.title', 'sounds.remixOf', 'sounds.ownerProfileNick as profileNick', 'profiles.displayName as profileDisplayName'])
    .where('sounds.ownerProfileNick', '=', nick)
    .orderBy('sounds.createdAt', 'desc')
    .execute()
}

actions.get.listRecentSounds = listRecentSounds
export async function listRecentSounds(_ctx: Context) {
  return await db
    .selectFrom('sounds')
    .innerJoin('profiles', 'sounds.ownerProfileNick', 'profiles.nick')
    .select(['sounds.id', 'sounds.title', 'sounds.remixOf', 'sounds.ownerProfileNick as profileNick', 'profiles.displayName as profileDisplayName'])
    .orderBy('sounds.createdAt', 'desc')
    .limit(20)
    .execute()
}

export type GetSoundResult = {
  sound: z.infer<typeof Sounds>
  creator: z.infer<typeof Profiles>
  remixOf: null | GetSoundResult
}

actions.get.getSound = getSound
export async function getSound(ctx: Context, id: string): Promise<GetSoundResult> {
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

  const remixOf = sound.remixOf
    ? await getSound(ctx, sound.remixOf)
    : null

  return { sound, creator, remixOf }
}

actions.post.addSoundToFavorites = addSoundToFavorites
export async function addSoundToFavorites(ctx: Context, soundId: string) {
  const session = getSession(ctx)
  const { defaultProfile } = session
  if (!defaultProfile) throw new RouteError(401, 'No default profile set')

  await db
    .insertInto('favorites')
    .values({ profileNick: defaultProfile, soundId })
    .execute()
}

actions.post.removeSoundFromFavorites = removeSoundFromFavorites
export async function removeSoundFromFavorites(ctx: Context, soundId: string) {
  const session = getSession(ctx)
  const { defaultProfile } = session
  if (!defaultProfile) throw new RouteError(401, 'No default profile set')

  await db
    .deleteFrom('favorites')
    .where('profileNick', '=', defaultProfile)
    .where('soundId', '=', soundId)
    .execute()
}

actions.get.listFavorites = listFavorites
export async function listFavorites(ctx: Context, nick?: string) {
  if (nick == null) {
    const session = getSession(ctx)
    const { defaultProfile } = session
    if (!defaultProfile) throw new RouteError(401, 'No default profile set')
    nick = defaultProfile
  }

  return await db
    .selectFrom('favorites')
    .innerJoin('sounds', 'favorites.soundId', 'sounds.id')
    .innerJoin('profiles', 'sounds.ownerProfileNick', 'profiles.nick')
    .select([
      'sounds.id',
      'sounds.title',
      'sounds.ownerProfileNick as profileNick',
      'profiles.displayName as profileDisplayName'
    ])
    .where('favorites.profileNick', '=', nick)
    .orderBy('favorites.createdAt', 'desc')
    .execute()
}
