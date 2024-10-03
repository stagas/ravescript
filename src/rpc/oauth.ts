import type * as actions from '../../api/actions/oauth.ts'
import { rpc } from '../../lib/rpc.ts'

export const getLoginSession = rpc<typeof actions.getLoginSession>('GET', 'getLoginSession')
export const registerOAuth = rpc<typeof actions.registerOAuth>('POST', 'registerOAuth')
