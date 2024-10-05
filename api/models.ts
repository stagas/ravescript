import { ColumnType } from "kysely";
import { z } from "zod";


export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;


export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const Channel = z.object({
  name: z.string(),
  createdAt: z.coerce.date(),
})
export interface Channel {
  createdAt: Generated<Timestamp>;
  name: string;
}

export const ChannelUser = z.object({
  channel: z.string(),
  nick: z.string(),
  joinedAt: z.coerce.date(),
})
export interface ChannelUser {
  channel: string;
  joinedAt: Generated<Timestamp>;
  nick: string;
}

export const Message = z.object({
  id: z.string(),
  channel: z.string(),
  type: z.string(),
  nick: z.string(),
  text: z.string(),
  createdAt: z.coerce.date(),
})
export interface Message {
  channel: string;
  createdAt: Generated<Timestamp>;
  id: Generated<string>;
  nick: string;
  text: string;
  type: string;
}

export const User = z.object({
  nick: z.string(),
  email: z.string(),
  emailVerified: z.boolean().nullish(),
  password: z.string().nullish(),
  oauthGithub: z.boolean().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export interface User {
  createdAt: Generated<Timestamp>;
  email: string;
  emailVerified: Generated<boolean | null>;
  nick: string;
  oauthGithub: boolean | null;
  password: string | null;
  updatedAt: Generated<Timestamp>;
}

export const DB = z.object({
  channel: Channel,
  channelUser: ChannelUser,
  message: Message,
  user: User,
})
export interface DB {
  channel: Channel;
  channelUser: ChannelUser;
  message: Message;
  user: User;
}
