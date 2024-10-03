import { kv } from '../core/app.ts'
import { Context, RouteError } from '../core/router.ts'
import { OAuthLogin } from '../routes/oauth/github.ts'
import { actions } from '../routes/rpc.ts'
import * as loginRegisterActions from './login-register.ts'

function pascalCase(s: string) {
  return s.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
}

actions.get.getLoginSession = getLoginSession
export async function getLoginSession(_ctx: Context, id: string) {
  const entry = await kv.get(['oauth', id])
  if (!entry.value) throw new RouteError(404, 'OAuth session not found')
  const session = OAuthLogin.parse(entry.value)
  return { login: session.login }
}

actions.post.registerOAuth = registerOAuth
export async function registerOAuth(ctx: Context, id: string, nick: string) {
  const entry = await kv.get(['oauth', id])
  if (!entry.value) throw new RouteError(404, 'OAuth session not found')
  const target = 'oauth' + pascalCase(id.split('-')[0]) as 'oauthGithub'
  const session = OAuthLogin.parse(entry.value)
  return await loginRegisterActions.register(ctx, {
    nick,
    email: session.email,
    // @ts-ignore ts has issues with dynamic keys
    [target]: true
  }, target)
}
