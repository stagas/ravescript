// deno-lint-ignore-file require-await
import { UserSession } from '~/api/auth/types.ts'
import { bus } from "~/api/chat/bus.ts"
import { broadcast, subs } from "~/api/chat/routes.ts"
import { ChatChannel, ChatDirectMessage, ChatDirectMessageType, ChatMessage, ChatMessageType, UiChannel } from "~/api/chat/types.ts"
import { createBus } from '~/api/core/create-bus.ts'
import { Context } from '~/api/core/router.ts'
import { getSession } from '~/api/core/sessions.ts'
import { db } from '~/api/db.ts'
import { actions } from '~/api/rpc/routes.ts'

const chatChannels = new Map<string, ChatChannel>()

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

function ensureChannel(name: string, session: UserSession) {
  if (chatChannels.has(name)) {
    const channel = chatChannels.get(name)!
    // remove session for nick
    for (const nick of channel.nicks) {
      if (nick === session.nick) {
        channel.nicks.delete(nick)
        break
      }
    }
    channel.nicks.add(session.nick)
    return channel
  }
  const nicks = new Set([session.nick])
  const bus = createBus(['chat', 'channel', name])
  bus.onmessage = ({ data }) => {
    for (const nick of nicks) {
      for (const [subNick, sub] of subs) {
        if (subNick === nick) {
          sub.send(data)
          break
        }
      }
    }
  }
  const channel: ChatChannel = { name, bus, nicks }
  chatChannels.set(name, channel)
  return channel
}

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

actions.get.getChannel = getChannel
export async function getChannel(_ctx: Context, channelName: string) {
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
  } as UiChannel
}

actions.post.sendMessageToChannel = sendMessageToChannel
export async function sendMessageToChannel(ctx: Context, type: ChatMessageType, channel: string, text: string = '') {
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
  for (const nick of chatChannel.nicks) {
    if (msg.type === 'message' && nick === session.nick) continue
    for (const [subNick, sub] of subs) {
      if (subNick === nick) {
        sub.send(msg)
        break
      }
    }
  }

  return message
}

actions.post.sendMessageToUser = sendMessageToUser
export async function sendMessageToUser(ctx: Context, type: ChatDirectMessageType, targetNick: string, text: string = '') {
  const { nick } = getSession(ctx)
  if (nick === targetNick) return

  const msg: ChatDirectMessage = {
    type,
    nick,
    text
  }

  const sub = subs.get(targetNick)
  if (sub) {
    sub.send(msg)
    return
  }

  bus.postMessage({ type, from: nick, nick: targetNick, text })
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
    .values({
      channelNickPair: `${channel}:${session.nick}`,
      channel,
      nick: session.nick
    })
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
    chatChannel.nicks.delete(session.nick)
    if (chatChannel.nicks.size === 0) {
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
