import { z } from 'zod'

export type User = z.infer<typeof User>
export const User = z.object({
  nick: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  password: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const UserGet = z.object({
  nick: z.string()
})

export type UserRegister = z.infer<typeof UserRegister>
export const UserRegister = z.object({
  nick: z.string(),
  email: z.string(),
  password: z.string().min(1), // TODO: .min(10)
})

export type UserLogin = z.infer<typeof UserLogin>
export const UserLogin = z.object({
  nickOrEmail: z.string(),
  password: z.string(),
})

export type UserSession = z.infer<typeof UserSession>
export const UserSession = z.object({
  nick: z.string(),
  expires: z.date(),
  isAdmin: z.boolean().optional(),
})

export type UserResetPassword = z.infer<typeof UserResetPassword>
export const UserResetPassword = z.object({
  token: z.string(),
  password: z.string().min(1), // TODO: .min(10)
})
