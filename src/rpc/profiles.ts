import type * as actions from '~/api/profiles/actions.ts'
import { rpc } from '~/lib/rpc.ts'

export const createProfile = rpc<typeof actions.createProfile>('POST', 'createProfile')
export const makeDefaultProfile = rpc<typeof actions.makeDefaultProfile>('POST', 'makeDefaultProfile')
export const getProfile = rpc<typeof actions.getProfile>('GET', 'getProfile')
export const listProfilesForNick = rpc<typeof actions.listProfilesForNick>('GET', 'listProfilesForNick')
export const deleteProfile = rpc<typeof actions.deleteProfile>('POST', 'deleteProfile')
