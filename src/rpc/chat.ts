import type * as actions from '~/api/chat/actions.ts'
import { rpc } from '~/lib/rpc.ts'

export const listChannels = rpc<typeof actions.listChannels>('GET', 'listChannels')
export const createChannel = rpc<typeof actions.createChannel>('POST', 'createChannel')
export const deleteChannel = rpc<typeof actions.deleteChannel>('POST', 'deleteChannel')
export const getChannel = rpc<typeof actions.getChannel>('GET', 'getChannel')
export const joinChannel = rpc<typeof actions.joinChannel>('POST', 'joinChannel')
export const sendMessageToChannel = rpc<typeof actions.sendMessageToChannel>('POST', 'sendMessageToChannel')
