// deno-lint-ignore-file require-await
import { hash } from 'jsr:@denorg/scrypt@4.4.4'
import { createCookie, randomHash, timeout } from 'utils'
import { kv } from '../core/app.ts'
import { SALT as salt } from '../core/constants.ts'
import { Context } from '../core/router.ts'
import { sendEmail } from '../core/send-email.ts'
import { sessions } from '../core/sessions.ts'
import { db } from '../db.ts'
import { env } from '../env.ts'
import { actions, RpcError } from '../routes/rpc.ts'
import { User, UserLogin, UserRegister, UserSession } from '../schemas/user.ts'
import { ADMINS } from './admin.ts'

// const DEBUG = true

class LoginError extends RpcError {
  constructor() { super(403, 'Wrong user or password') }
}

class UserExistsError extends RpcError {
  constructor() { super(409, 'User already exists') }
}

class UnableToRegisterError extends RpcError {
  constructor() { super(500, 'Unable to register') }
}

class UserEmailAlreadyVerified extends RpcError {
  constructor() { super(404, 'Email already verified') }
}

class UserNotFound extends RpcError {
  constructor() { super(404, 'User not found') }
}

class TokenNotFound extends RpcError {
  constructor() { super(404, 'Token not found') }
}

export async function getUserByNick(nick: string) {
  return await db
    .selectFrom('user')
    .selectAll()
    .where('nick', '=', nick)
    .executeTakeFirst()
}

export async function getUserByEmail(email: string) {
  return await db
    .selectFrom('user')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst()
}

export async function getUser(nickOrEmail: string) {
  return await getUserByNick(nickOrEmail) || await getUserByEmail(nickOrEmail)
}

async function loginUser(ctx: Context, nick: string) {
  ctx.log('Login:', nick)

  const sessionId = randomHash()
  const sessionKey = ['session', sessionId]

  const now = new Date()
  const expires = new Date(now)
  // expires.setMinutes(expires.getMinutes() + 1)
  expires.setUTCFullYear(expires.getUTCFullYear() + 1)

  const isAdmin = ADMINS.includes(nick)
  const session: UserSession = { nick, expires, isAdmin }
  await kv.set(sessionKey, session, {
    expireIn: expires.getTime() - now.getTime()
  })

  ctx.done.then(res => {
    res.headers.set('set-cookie', createCookie(
      'session',
      sessionId,
      expires,
      'SameSite=Strict',
      'Secure',
      'HttpOnly',
    ))
  })

  return session
}

async function generateEmailVerificationToken(email: string) {
  const token = randomHash()
  const now = new Date()
  const expires = new Date(now)
  const expireAfterHours = 3 * 24 // 3 days
  expires.setHours(expires.getHours() + expireAfterHours)

  await kv.set(['emailVerification', token], email, {
    expireIn: expires.getTime() - now.getTime()
  })

  return token
}

actions.post.whoami = whoami
export async function whoami(ctx: Context) {
  const session = sessions.get(ctx)
  return session
}

actions.post.login = login
export async function login(ctx: Context, userLogin: UserLogin) {
  const { nickOrEmail, password } = UserLogin.parse(userLogin)

  const user = await getUser(nickOrEmail)
  if (!user) throw new LoginError()

  const hashed = hash(password, { salt })
  const authorized = hashed === user.password
  if (!authorized) throw new LoginError()

  return loginUser(ctx, user.nick)
}

actions.post.register = register
export async function register(ctx: Context, userRegister: UserRegister) {
  const { nick, email, password } = userRegister

  if (await getUserByNick(nick) || await getUserByEmail(email)) {
    throw new UserExistsError()
  }

  await db.insertInto('user')
    .values({
      nick,
      email,
      emailVerified: false,
      password: hash(password, { salt })
    })
    .executeTakeFirstOrThrow(UnableToRegisterError)

  sendVerificationEmail(ctx, email).catch(ctx.log)

  return loginUser(ctx, nick)
}

actions.post.sendVerificationEmail = sendVerificationEmail
export async function sendVerificationEmail(ctx: Context, email: string) {
  const user = await getUserByEmail(email)
  if (!user) throw new UserNotFound()
  if (user.emailVerified) throw new UserEmailAlreadyVerified()

  const token = await generateEmailVerificationToken(email)

  ctx.log(`Send email verification for user ${user.nick} to:`, email, 'token:', token)

  const emailVerificationUrl = `${env.WEB_URL}/verify-email?token=${token}`

  const result = await sendEmail({
    to: [email],
    subject: 'Email verification',

    html: `\
<p><a href="${emailVerificationUrl}">Click here</a> to verify your email.</p>

<p>If you did not register, simply ignore this email.</p>`,

    text: `\
Click this link to verify your email: ${emailVerificationUrl}

If you did not register, simply ignore this email.`,
  })

  if (!result.ok) {
    throw new RpcError(result.error.statusCode, result.error.message)
  }
}

actions.post.verifyEmail = verifyEmail
export async function verifyEmail(ctx: Context, token: string) {
  ctx.log('Verify email using token:', token)

  const email = await kv.get<string>(['emailVerification', token])
  if (!email.value) throw new TokenNotFound()

  const user = await getUserByEmail(email.value)
  if (!user) throw new UserNotFound()

  ctx.log(`Verify email for user ${user.nick}:`, email)

  await db
    .updateTable('user')
    .where('email', '=', email.value)
    .set('emailVerified', true)
    .executeTakeFirstOrThrow()

  await kv.delete(['emailVerification', token])
}

actions.post.logout = logout
export async function logout(ctx: Context) {
  const { session } = ctx.cookies
  if (session) await kv.delete(['session', session])
  ctx.done.then(res => {
    res.headers.set('set-cookie', 'session=; expires=Thu, Jan 01 1970 00:00:00 GMT')
  })
}

actions.post.forgotPassword = forgotPassword
export async function forgotPassword(ctx: Context, nickOrEmail: string) {
  ctx.log('Forgot password for:', nickOrEmail)

  const user = await getUser(nickOrEmail)

  if (!user) {
    ctx.log('Forgot password user does not exist:', nickOrEmail)
    // fake a delay that would have been a call to an email service
    await timeout(2000 + Math.random() * 5000)
    return
  }

  const token = randomHash()
  const now = new Date()
  const expires = new Date(now)
  const expireAfterMinutes = 15
  expires.setMinutes(expires.getMinutes() + expireAfterMinutes)

  await kv.set(['resetPassword', token], user.nick, { expireIn: expires.getTime() - now.getTime() })

  ctx.log('Send reset password email for user', user.nick, 'to email:', user.email, 'token:', token)

  const emailResetPasswordUrl = `${env.WEB_URL}/reset-password?token=${token}`

  const result = await sendEmail({
    to: [user.email],
    subject: 'Reset password',

    html: `\
<p><a href="${emailResetPasswordUrl}">Click here</a> to reset your password.</p>

<p>If you did not request a password reset, simply ignore this email.</p>`,

    text: `\
Click this link to reset your password: ${emailResetPasswordUrl}

If you did not request a password reset, simply ignore this email.`,
  })

  if (!result.ok) {
    throw new RpcError(result.error.statusCode, result.error.message)
  }
}

actions.get.getResetPasswordUser = getResetPasswordUser
export async function getResetPasswordUser(_ctx: Context, token: string) {
  const result = await kv.get<string>(['resetPassword', token])

  if (result.value) {
    const user = await getUserByNick(result.value)
    if (user) {
      // @ts-ignore remove password before returning
      delete user.password
      return user as Omit<User, 'password'>
    }
  }

  throw new TokenNotFound()
}

actions.post.changePassword = changePassword
export async function changePassword(ctx: Context, token: string, password: string) {
  ctx.log('Reset password using token:', token)

  const nick = await kv.get<string>(['resetPassword', token])
  if (!nick.value) throw new TokenNotFound()

  ctx.log('Reset password for user:', nick)

  await db
    .updateTable('user')
    .where('nick', '=', nick.value)
    .set('password', hash(password, { salt }))
    .executeTakeFirstOrThrow()

  await kv.delete(['resetPassword', token])

  return loginUser(ctx, nick.value)
}
