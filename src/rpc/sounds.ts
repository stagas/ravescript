import type * as actions from '~/api/sounds/actions.ts'
import { rpc } from '~/lib/rpc.ts'

export const publishSound = rpc<typeof actions.publishSound>('POST', 'publishSound')
export const overwriteSound = rpc<typeof actions.overwriteSound>('POST', 'overwriteSound')
export const deleteSound = rpc<typeof actions.deleteSound>('POST', 'deleteSound')
export const listSounds = rpc<typeof actions.listSounds>('GET', 'listSounds')
export const listRecentSounds = rpc<typeof actions.listRecentSounds>('GET', 'listRecentSounds')
export const getSound = rpc<typeof actions.getSound>('GET', 'getSound')
export const addSoundToFavorites = rpc<typeof actions.addSoundToFavorites>('POST', 'addSoundToFavorites')
export const removeSoundFromFavorites = rpc<typeof actions.removeSoundFromFavorites>('POST', 'removeSoundFromFavorites')
export const listFavorites = rpc<typeof actions.listFavorites>('GET', 'listFavorites')
