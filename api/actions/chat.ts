import { defer } from 'utils'
import { Context } from '../core/router.ts'
import { getSession } from '../core/sessions.ts'
import { db } from '../db.ts'
import { chatSubs } from '../routes/chat.ts'
import { actions } from '../routes/rpc.ts'
import { UiUser, UserSession } from '../schemas/user.ts'

const chatBus = new BroadcastChannel('chatBus')
const chatChannels = new Map<string, ChatChannel>()

interface ChatChannel {
  name: string
  bus: BroadcastChannel
  userSessions: Set<UserSession>
}

export interface UiChannel {
  name: string
  users: UiUser[]
  messages: ChatMessage[]
}

type ChatMessageType =
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

actions.get.listChannels = listChannels
export async function listChannels(_ctx: Context) {
  return await db
    .selectFrom('channel')
    .select(['name'])
    .execute()
}

actions.post.createChannel = createChannel
export async function createChannel(ctx: Context, channel: string) {
  const session = getSession(ctx)
  const { nick } = session

  await db
    .insertInto('channel')
    .values({ name: channel })
    .returning(['name'])
    .executeTakeFirstOrThrow()

  ensureChannel(channel, session)

  const msg: ChatMessage = { type: 'createChannel', nick, text: channel }
  chatBus.postMessage(msg)
  for (const stream of chatSubs.values()) stream.send(msg)

  await joinChannel(ctx, channel)
}

function ensureChannel(name: string, session: UserSession) {
  let bus: BroadcastChannel
  using _ = defer(() => {
    bus.addEventListener('message', ({ data }) => {
      console.log('broadcast to', name, data)
      for (const userSession of userSessions) {
        // if (nick === userSession.nick) continue
        for (const [sess, sub] of chatSubs) {
          if (sess.nick === userSession.nick) {
            sub.send(data)
            break
          }
        }
      }
    })
  })
  if (chatChannels.has(name)) {
    const channel = chatChannels.get(name)!
    bus = channel.bus
    // remove session for nick
    for (const userSession of channel.userSessions) {
      if (userSession.nick === session.nick) {
        channel.userSessions.delete(userSession)
        break
      }
    }
    channel.userSessions.add(session)
    console.log('reused', name, session.nick)
    return channel
  }
  // const { nick } = session
  const userSessions = new Set([session])
  bus = new BroadcastChannel(`chatChannel:${name}`)
  const channel: ChatChannel = { name, bus, userSessions }
  chatChannels.set(name, channel)
  console.log('created', channel.name, session.nick)
  return channel
}

actions.post.joinChannel = joinChannel
export async function joinChannel(ctx: Context, channel: string) {
  const session = getSession(ctx)

  ensureChannel(channel, session)

  // check if user is already in channel
  const existing = await db
    .selectFrom('channelUser')
    .selectAll()
    .where('channel', '=', channel)
    .where('nick', '=', session.nick)
    .executeTakeFirst()

  if (existing) return existing

  const join = await db
    .insertInto('channelUser')
    .values({ channel, nick: session.nick })
    .returningAll()
    .executeTakeFirstOrThrow()

  sendMessageToChannel(ctx, 'join', channel)
  return join
}

actions.post.partChannel = partChannel
export async function partChannel(ctx: Context, channel: string) {
  const session = getSession(ctx)

  const part = await db
    .deleteFrom('channelUser')
    .where('channel', '=', channel)
    .where('nick', '=', session.nick)
    .executeTakeFirstOrThrow()

  await sendMessageToChannel(ctx, 'part', channel)

  const chatChannel = chatChannels.get(channel)
  if (chatChannel) {
    chatChannel.userSessions.delete(session)
    if (chatChannel.userSessions.size === 0) {
      chatChannel.bus.close()
      chatChannels.delete(channel)
    }
  }

  return part
}

actions.post.deleteChannel = deleteChannel
export async function deleteChannel(_ctx: Context, name: string) {
  return await db
    .deleteFrom('channel')
    .where('name', '=', name)
    .executeTakeFirstOrThrow()
}

async function getChannelMessages(_ctx: Context, channel: string) {
  return await db
    .selectFrom('message')
    .selectAll()
    .where('channel', '=', channel)
    .orderBy('createdAt', 'asc')
    .execute()
}

async function getChannelUsers(_ctx: Context, channel: string) {
  return await db
    .selectFrom('channelUser')
    .selectAll()
    .where('channel', '=', channel)
    .orderBy('nick')
    .execute()
}

actions.get.getChannel = getChannel
export async function getChannel(_ctx: Context, channelName: string): Promise<UiChannel> {
  const messages = await getChannelMessages(_ctx, channelName)
  const users = await getChannelUsers(_ctx, channelName)
  return {
    name: channelName,
    messages: messages.map(m => ({
      type: m.type as ChatMessageType,
      nick: m.nick,
      text: m.text,
    })),
    users
  }
}

actions.post.sendMessageToChannel = sendMessageToChannel
export async function sendMessageToChannel(
  ctx: Context,
  type: ChatMessageType,
  channel: string,
  text: string = '',
) {
  const session = getSession(ctx)
  const { nick } = session

  const message = await db
    .insertInto('message')
    .values({
      type,
      channel,
      nick,
      text
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  const chatChannel = ensureChannel(channel, session)
  const msg: ChatMessage = {
    type,
    channel,
    nick,
    text,
  }
  console.log('post', msg, chatChannel.userSessions)
  chatChannel.bus.postMessage(msg)
  for (const userSession of chatChannel.userSessions) {
    if (userSession.nick === session.nick) continue
    for (const [sess, sub] of chatSubs) {
      if (sess.nick === userSession.nick) {
        sub.send(msg)
        break
      }
    }
  }

  return message
}
