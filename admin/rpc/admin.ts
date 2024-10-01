import type * as actions from '../../api/actions/admin.ts'
import { rpcAction } from '../../lib/rpc-action.ts'

export const listUsers = rpcAction<typeof actions.listUsers>('listUsers')
export const deleteUser = rpcAction<typeof actions.deleteUser>('deleteUser')
export const clearUsers = rpcAction<typeof actions.clearUsers>('clearUsers')

export const listSessions = rpcAction<typeof actions.listSessions>('listSessions')
export const deleteSession = rpcAction<typeof actions.deleteSession>('deleteSession')
export const clearSessions = rpcAction<typeof actions.clearSessions>('clearSessions')
