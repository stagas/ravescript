// deno-lint-ignore-file require-await
import { hash } from 'jsr:@denorg/scrypt@4.4.4'
import { createCookie, parseCookie, randomHash } from 'utils'
import { kv } from '../core/app.ts'
import { SALT as salt } from '../core/constants.ts'
import { Context } from '../core/router.ts'
import { sessions } from '../core/sessions.ts'
import { db } from '../db.ts'
import { actions, RpcError } from '../routes/rpc.ts'
import { UserLogin, UserRegister, UserSession } from '../schemas/user.ts'
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

async function getUserByNick(nick: string) {
  return await db
    .selectFrom('user')
    .selectAll()
    .where('nick', '=', nick)
    .executeTakeFirst()
}

async function getUserByEmail(email: string) {
  return await db
    .selectFrom('user')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst()
}

async function getUser(nickOrEmail: string) {
  return await getUserByNick(nickOrEmail) || await getUserByEmail(nickOrEmail)
}

async function loginUser(ctx: Context, nick: string) {
  ctx.log('Login:', nick)

  const sessionId = randomHash()
  const sessionKey = ['session', sessionId]

  const now = new Date()
  const expires = new Date(now)
  expires.setMinutes(expires.getMinutes() + 1)
  // expires.setUTCFullYear(expires.getUTCFullYear() + 1)

  const isAdmin = ADMINS.includes(nick)
  const session: UserSession = { nick, expires, isAdmin }
  await kv.set(sessionKey, session, { expireIn: expires.getTime() - now.getTime() })

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

actions.whoami = whoami
export async function whoami(ctx: Context) {
  const session = sessions.get(ctx)
  return session
}

actions.login = login
export async function login(ctx: Context, userLogin: UserLogin) {
  const { nickOrEmail, password } = UserLogin.parse(userLogin)

  const user = await getUser(nickOrEmail)
  if (!user) throw new LoginError()

  const hashed = hash(password, { salt })
  const authorized = hashed === user.password
  if (!authorized) throw new LoginError()

  return loginUser(ctx, user.nick)
}

actions.register = register
export async function register(ctx: Context, userRegister: UserRegister) {
  const { nick, email, password } = userRegister

  if (await getUserByNick(nick) || await getUserByEmail(email)) {
    throw new UserExistsError()
  }

  await db.insertInto('user')
    .values({
      nick,
      email,
      password: hash(password, { salt })
    })
    .executeTakeFirstOrThrow(UnableToRegisterError)

  return loginUser(ctx, nick)
}

actions.logout = logout
export async function logout(ctx: Context) {
  const { session } = ctx.cookies
  if (session) await kv.delete(['session', session])
  ctx.done.then(res => {
    res.headers.set('set-cookie', 'session=; expires=Thu, Jan 01 1970 00:00:00 GMT')
  })
}
