import { ColumnType } from "kysely";
import { z } from "zod";


export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;


export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const User = z.object({
  nick: z.string(),
  email: z.string(),
  password: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export interface User {
  createdAt: Generated<Timestamp>;
  email: string;
  nick: string;
  password: string;
  updatedAt: Generated<Timestamp>;
}

export const DB = z.object({
  user: User,
})
export interface DB {
  user: User;
}
