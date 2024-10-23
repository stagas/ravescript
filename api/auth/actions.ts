// deno-lint-ignore-file require-await
import { hash } from 'jsr:@denorg/scrypt@4.4.4'
import { createCookie, timeout } from 'utils'
import { ADMINS } from '~/api/admin/actions.ts'
import { UserLogin, UserRegister, UserSession } from "~/api/auth/types.ts"
import { kv } from '~/api/core/app.ts'
import { SALT as salt } from '~/api/core/constants.ts'
import { Context, RouteError } from '~/api/core/router.ts'
import { sendEmail } from '~/api/core/send-email.ts'
import { sessions } from '~/api/core/sessions.ts'
import { db } from '~/api/db.ts'
import { actions } from '~/api/rpc/routes.ts'

// const DEBUG = true

class LoginError extends RouteError {
  constructor() { super(403, 'Wrong user or password') }
}

class UserExistsError extends RouteError {
  constructor() { super(409, 'User already exists') }
}

class UnableToRegisterError extends RouteError {
  constructor() { super(500, 'Unable to register') }
}

class UserEmailAlreadyVerified extends RouteError {
  constructor() { super(404, 'Email already verified') }
}

class UserNotFound extends RouteError {
  constructor() { super(404, 'User not found') }
}

class TokenNotFound extends RouteError {
  constructor() { super(404, 'Token not found') }
}

export async function getUserByNick(nick: string) {
  return await db
    .selectFrom('users')
    .selectAll()
    .where('nick', '=', nick)
    .executeTakeFirst()
}

export async function getUserByNickOrThrow(nick: string) {
  return await db
    .selectFrom('users')
    .selectAll()
    .where('nick', '=', nick)
    .executeTakeFirstOrThrow()
}

export async function getUserByEmail(email: string) {
  return await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst()
}

export async function getUser(nickOrEmail: string) {
  return await getUserByNick(nickOrEmail) || await getUserByEmail(nickOrEmail)
}

export async function loginUser(ctx: Context, nick: string) {
  ctx.log('Login:', nick)

  const sessionId = crypto.randomUUID()
  const sessionKey = ['session', sessionId]

  const now = new Date()
  const expires = new Date(now)
  // expires.setMinutes(expires.getMinutes() + 1)
  expires.setUTCFullYear(expires.getUTCFullYear() + 1)

  const isAdmin = ADMINS.includes(nick)
  const user = await getUserByNickOrThrow(nick)
  const session: UserSession = {
    nick,
    expires,
    isAdmin,
    defaultProfile: user.defaultProfile ?? '(unset)'
  }
  await kv.set(sessionKey, session, {
    expireIn: expires.getTime() - now.getTime()
  })

  ctx.done.then(res => {
    res.headers.set('set-cookie', createCookie(
      'session',
      sessionId,
      expires,
      'Path=/',
      'SameSite=Strict',
      'Secure',
      'HttpOnly',
    ))
  })

  return session
}

async function generateEmailVerificationToken(email: string) {
  const token = crypto.randomUUID()
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
  return session ?? null
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
export async function register(ctx: Context, userRegister: UserRegister, oauthField?: 'oauthGithub') {
  const { nick, email } = userRegister

  const userByNick = await getUserByNick(nick)
  const userByEmail = await getUserByEmail(email)

  // user nick or email exists
  if (userByNick || userByEmail) {
    // user has registered with password before and is now logging in with oauth
    if (oauthField && userByEmail) {
      await db
        .updateTable('users')
        .where('email', '=', email)
        .set('emailVerified', true)
        .set(oauthField, true)
        .executeTakeFirstOrThrow(UnableToRegisterError)
    }
    // user has logged in with oauth before and is now registering with password
    else if (userByEmail?.emailVerified && 'password' in userRegister && !userByEmail.password) {
      await db
        .updateTable('users')
        .where('email', '=', email)
        .set('password', hash(userRegister.password, { salt }))
        .executeTakeFirstOrThrow(UnableToRegisterError)
    }
    else {
      throw new UserExistsError()
    }
  }
  // user is new
  else {
    let values: UserRegister
    // user registers with password
    if ('password' in userRegister) {
      values = {
        nick,
        email,
        password: hash(userRegister.password, { salt })
      }
    }
    // user registers with oauth
    else if (oauthField) {
      values = {
        nick,
        email,
        emailVerified: true,
        // @ts-ignore ts has issues with dynamic keys even though it is typed
        [oauthField]: true
      }
    }
    else {
      throw new RouteError(400, 'Invalid registration')
    }

    await db
      .insertInto('users')
      .values(values)
      .executeTakeFirstOrThrow(UnableToRegisterError)

    if (!oauthField) sendVerificationEmail(ctx, email).catch(ctx.log)
  }

  return loginUser(ctx, nick)
}

actions.post.sendVerificationEmail = sendVerificationEmail
export async function sendVerificationEmail(ctx: Context, email: string) {
  const user = await getUserByEmail(email)
  if (!user) throw new UserNotFound()
  if (user.emailVerified) throw new UserEmailAlreadyVerified()

  const token = await generateEmailVerificationToken(email)

  ctx.log(`Send email verification for user ${user.nick} to:`, email, 'token:', token)

  const emailVerificationUrl = `${ctx.origin}/verify-email?token=${token}`

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
    throw new RouteError(result.error.statusCode, result.error.message)
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
    .updateTable('users')
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
export async function forgotPassword(ctx: Context, email: string) {
  ctx.log('Forgot password for:', email)

  const user = await getUserByEmail(email)

  if (!user) {
    ctx.log('Forgot password user does not exist:', email)
    // fake a delay that would have been a call to an email service
    await timeout(2000 + Math.random() * 5000)
    return
  }

  const token = crypto.randomUUID()
  const now = new Date()
  const expires = new Date(now)
  const expireAfterMinutes = 15
  expires.setMinutes(expires.getMinutes() + expireAfterMinutes)

  await kv.set(['resetPassword', token], user.nick, { expireIn: expires.getTime() - now.getTime() })

  ctx.log('Send reset password email for user', user.nick, 'to email:', user.email, 'token:', token)

  const emailResetPasswordUrl = `${ctx.origin}/reset-password?token=${token}`

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
    throw new RouteError(result.error.statusCode, result.error.message)
  }
}

actions.get.getResetPasswordUserNick = getResetPasswordUserNick
export async function getResetPasswordUserNick(_ctx: Context, token: string) {
  const result = await kv.get<string>(['resetPassword', token])

  if (result.value) {
    const user = await getUserByNick(result.value)
    if (user) {
      return user.nick
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
    .updateTable('users')
    .where('nick', '=', nick.value)
    .set('password', hash(password, { salt }))
    .executeTakeFirstOrThrow()

  await kv.delete(['resetPassword', token])

  return loginUser(ctx, nick.value)
}
