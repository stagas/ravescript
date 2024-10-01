import type {
  listUsers as listUsersAction
} from '../../api/actions/admin.ts'
import { rpcAction } from '../../lib/rpc-action.ts'

export const listUsers = rpcAction<typeof listUsersAction>('listUsers')
