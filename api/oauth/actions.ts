import * as authActions from '~/api/auth/actions.ts'
import { kv } from '~/api/core/app.ts'
import { Context, RouteError } from '~/api/core/router.ts'
import { OAuthSession } from "~/api/oauth/routes/github.ts"
import { actions } from '~/api/rpc/routes.ts'

function pascalCase(s: string) {
  return s.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
}

actions.get.getLoginSession = getLoginSession
export async function getLoginSession(_ctx: Context, id: string) {
  const entry = await kv.get(['oauth', id])
  if (!entry.value) throw new RouteError(404, 'OAuth session not found')
  const session = OAuthSession.parse(entry.value)
  return { login: session.login }
}

actions.post.registerOAuth = registerOAuth
export async function registerOAuth(ctx: Context, id: string, nick: string) {
  const entry = await kv.get(['oauth', id])
  if (!entry.value) throw new RouteError(404, 'OAuth session not found')
  const session = OAuthSession.parse(entry.value)
  const oauthField = `oauth${pascalCase(session.state.provider)}` as 'oauthGithub'
  return await authActions.register(ctx, {
    nick,
    email: session.email,
    // @ts-ignore ts has issues with dynamic keys
    [oauthField]: true
  }, oauthField)
}
