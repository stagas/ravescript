import { z } from 'zod'

export interface UiUser {
  nick: string
}

export const UserGet = z.object({
  nick: z.string()
})

export type UserRegister = z.infer<typeof UserRegister>
export const UserRegister = z.union([
  z.object({
    nick: z.string(),
    email: z.string(),
    password: z.string().min(1), // TODO: .min(10)
  }),
  z.object({
    nick: z.string(),
    email: z.string(),
    emailVerified: z.boolean().optional(),
  }),
])

export type UserLogin = z.infer<typeof UserLogin>
export const UserLogin = z.object({
  nickOrEmail: z.string(),
  password: z.string(),
})

export type UserForgot = z.infer<typeof UserForgot>
export const UserForgot = z.object({
  email: z.string(),
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
