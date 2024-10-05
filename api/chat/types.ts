import { UiUser, UserSession } from '~/api/auth/types.ts'

export interface ChatChannel {
  name: string
  bus: BroadcastChannel
  userSessions: Set<UserSession>
}

export interface UiChannel {
  name: string
  users: UiUser[]
  messages: ChatMessage[]
}

export type ChatMessageType =
  | 'started'
  | 'createChannel'
  | 'message'
  | 'join'
  | 'part'

export interface ChatMessage {
  type: ChatMessageType
  channel?: string
  nick: string
  text: string
}
