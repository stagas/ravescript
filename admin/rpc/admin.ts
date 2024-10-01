import type * as actions from '../../api/actions/admin.ts'
import { rpcAction } from '../../lib/rpc-action.ts'

export const listUsers = rpcAction<typeof actions.listUsers>('listUsers')
