import type {
  listUsers as listUsersAction
} from '../../api/actions/admin.ts'
import { rpcAction } from '../../src/rpc-action.ts'

export const listUsers = rpcAction<typeof listUsersAction>('listUsers')
