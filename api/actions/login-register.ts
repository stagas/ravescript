// deno-lint-ignore-file require-await
import { hash } from 'jsr:@denorg/scrypt@4.4.4'
import { createCookie, randomHash } from 'utils'
import { kv } from '../core/app.ts'
import { SALT as salt } from '../core/constants.ts'
import { Context } from '../core/router.ts'
import { sessions } from '../core/sessions.ts'
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

async function getUser(nickOrEmail: string) {
  let nick: string | false

  {
    const entry = await kv.get(['email', nickOrEmail])
    if (entry.value) {
      nick = typeof entry.value === 'string' && entry.value
    }
    else {
      nick = nickOrEmail
    }
  }

  const entry = await kv.get(['user', nick])

  return User.safeParse(entry.value)
}

async function loginUser(ctx: Context, nick: string) {
  ctx.log('Login:', nick)

  const sessionId = randomHash()
  const sessionKey = ['session', sessionId]

  const expires = new Date()
  // expires.setMinutes(expires.getMinutes() + 1)
  expires.setUTCFullYear(expires.getUTCFullYear() + 1)

  const isAdmin = ADMINS.includes(nick)
  const session: UserSession = { nick, expires, isAdmin }
  await kv.set(sessionKey, session)

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
  if (!user.success) throw new LoginError()

  const hashed = hash(password, { salt })
  const authorized = hashed === user.data.password
  if (!authorized) throw new LoginError()

  return loginUser(ctx, user.data.nick)
}

actions.register = register
export async function register(ctx: Context, userRegister: UserRegister) {
  const { nick, email, password } = userRegister

  {
    const nickKey = ['user', nick]
    const userByNick = await kv.get(nickKey)
    if (userByNick.value) throw new UserExistsError()

    const emailKey = ['email', email]
    const userByEmail = await kv.get(emailKey)
    if (userByEmail.value) throw new UserExistsError()

    const date = new Date()

    const value = User.parse({
      nick,
      email,
      password: hash(password, { salt }),
      createdAt: date,
      updatedAt: date,
    } satisfies User)

    const result = await kv.set(nickKey, value)
    if (!result.ok) throw new UnableToRegisterError()
  }

  {
    const key = ['email', email]
    const value = nick
    const result = await kv.set(key, value)
    if (!result.ok) throw new UnableToRegisterError()
  }

  return loginUser(ctx, nick)
}

actions.logout = logout
export async function logout(ctx: Context) {
  ctx.done.then(res => {
    res.headers.set('set-cookie', 'session=; expires=Thu, Jan 01 1970 00:00:00 GMT')
  })
}
