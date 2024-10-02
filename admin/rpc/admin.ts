import type * as actions from '../../api/actions/admin.ts'
import { rpcAction } from '../../lib/rpc-action.ts'

export const listUsers = rpcAction<typeof actions.listUsers>('GET', 'listUsers')
export const deleteUser = rpcAction<typeof actions.deleteUser>('POST', 'deleteUser')
export const clearUsers = rpcAction<typeof actions.clearUsers>('POST', 'clearUsers')

export const listSessions = rpcAction<typeof actions.listSessions>('GET', 'listSessions')
export const deleteSession = rpcAction<typeof actions.deleteSession>('POST', 'deleteSession')
export const clearSessions = rpcAction<typeof actions.clearSessions>('POST', 'clearSessions')
