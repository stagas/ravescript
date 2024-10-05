import type * as actions from '~/api/admin/actions.ts'
import { rpc } from '~/lib/rpc.ts'

export const listUsers = rpc<typeof actions.listUsers>('GET', 'listUsers')
export const deleteUser = rpc<typeof actions.deleteUser>('POST', 'deleteUser')
export const clearUsers = rpc<typeof actions.clearUsers>('POST', 'clearUsers')

export const listSessions = rpc<typeof actions.listSessions>('GET', 'listSessions')
export const deleteSession = rpc<typeof actions.deleteSession>('POST', 'deleteSession')
export const clearSessions = rpc<typeof actions.clearSessions>('POST', 'clearSessions')
