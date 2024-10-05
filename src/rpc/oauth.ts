import type * as actions from '~/api/oauth/actions.ts'
import { rpc } from '~/lib/rpc.ts'

export const getLoginSession = rpc<typeof actions.getLoginSession>('GET', 'getLoginSession')
export const registerOAuth = rpc<typeof actions.registerOAuth>('POST', 'registerOAuth')
