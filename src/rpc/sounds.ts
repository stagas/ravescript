import type * as actions from '~/api/sounds/actions.ts'
import { rpc } from '~/lib/rpc.ts'

export const publishSound = rpc<typeof actions.publishSound>('POST', 'publishSound')
export const listSounds = rpc<typeof actions.listSounds>('GET', 'listSounds')
export const getSound = rpc<typeof actions.getSound>('GET', 'getSound')
