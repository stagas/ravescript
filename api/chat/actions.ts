import { UserSession } from '~/api/auth/types.ts'
import { bus } from "~/api/chat/bus.ts"
import { broadcast, subs } from "~/api/chat/routes.ts"
import { ChatChannel, ChatMessage, ChatMessageType, UiChannel } from "~/api/chat/types.ts"
import { createBus } from '~/api/core/create-bus.ts'
import { Context } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'
import { db } from '~/api/db.ts'
import { actions } from '~/api/rpc/routes.ts'

const chatChannels = new Map<string, ChatChannel>()

actions.get.listChannels = listChannels
export async function listChannels(_ctx: Context) {
  return await db
    .selectFrom('channels')
    .select(['name'])
    .execute()
}

actions.post.createChannel = createChannel
export async function createChannel(ctx: Context, channel: string) {
  const session = getSession(ctx)
  const { nick } = session

  await db
    .insertInto('channels')
    .values({ name: channel })
    .returning(['name'])
    .executeTakeFirstOrThrow()

  ensureChannel(channel, session)

  const msg: ChatMessage = { type: 'createChannel', nick, text: channel }
  bus.postMessage(msg)
  broadcast(msg)

  await joinChannel(ctx, channel)
}

function ensureChannel(name: string, session: UserSession) {
  if (chatChannels.has(name)) {
    const channel = chatChannels.get(name)!
    // remove session for nick
    for (const userSession of channel.userSessions) {
      if (userSession.nick === session.nick) {
        channel.userSessions.delete(userSession)
        break
      }
    }
    channel.userSessions.add(session)
    return channel
  }
  // const { nick } = session
  const userSessions = new Set([session])
  const bus = createBus(['chat', 'channel', name])
  bus.onmessage = ({ data }) => {
    // console.log('received', name, data)
    for (const userSession of userSessions) {
      // if (nick === userSession.nick) continue
      for (const [nick, sub] of subs) {
        if (nick === userSession.nick) {
          sub.send(data)
          break
        }
      }
    }
  }
  const channel: ChatChannel = { name, bus, userSessions }
  chatChannels.set(name, channel)
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
    .deleteFrom('channels')
    .where('name', '=', name)
    .executeTakeFirstOrThrow()
}

async function getChannelMessages(_ctx: Context, channel: string) {
  return await db
    .selectFrom('messages')
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
    .insertInto('messages')
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

  chatChannel.bus.postMessage(msg)
  for (const userSession of chatChannel.userSessions) {
    if (userSession.nick === session.nick) continue
    for (const [nick, sub] of subs) {
      if (nick === userSession.nick) {
        sub.send(msg)
        break
      }
    }
  }

  return message
}
