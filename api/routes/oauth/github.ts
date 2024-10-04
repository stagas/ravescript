import { createCookie, randomHash } from 'utils'
import { z } from 'zod'
import { getUserByEmail, loginUser } from '../../actions/login-register.ts'
import { kv } from '../../core/app.ts'
import { fetchJson } from '../../core/fetch-json.ts'
import { RouteError, Router } from '../../core/router.ts'
import { env } from '../../env.ts'
import { OAuthState } from './common.ts'

const OAuthError = z.object({
  error: z.string(),
  error_description: z.string(),
  error_uri: z.string(),
  state: z.string(),
})

const OAuthCallback = z.union([
  OAuthError,
  z.object({
    code: z.string(),
    state: z.string().optional()
  }),
])

export const OAuthSession = z.object({
  login: z.string().optional(),
  email: z.string(),
  access_token: z.string(),
  state: OAuthState,
})
export type OAuthLogin = z.infer<typeof OAuthSession>

const OAuthAccessToken = z.union([
  OAuthError,
  z.object({
    access_token: z.string(),
    scope: z.string(),
    token_type: z.string()
  }),
])

const OAuthUser = z.union([
  OAuthError,
  z.object({
    login: z.string(),
    email: z.string(),
  }),
])

const headers = {
  'content-type': 'application/json',
  'user-agent': 'cfw-oauth-login',
  accept: 'application/json',
}

export function mount(app: Router) {
  const {
    OAUTH_GITHUB_CLIENT_ID: client_id,
    OAUTH_GITHUB_CLIENT_SECRET: client_secret
  } = env

  // OAuth callback
  app.get('/oauth/github', [async ctx => {
    const cb = OAuthCallback.parse(Object.fromEntries(ctx.url.searchParams.entries()))

    const { state: oauthStateId } = cb
    const entry = await kv.get(['oauthState', oauthStateId!])
    if (!entry.value) throw new RouteError(401, 'Invalid state')
    const state = OAuthState.parse(entry.value)
    const { origin } = state

    if ('error' in cb) {
      if (cb.error === 'access_denied') {
        return ctx.redirect(302, `${origin}/oauth/cancel`)
      }
      throw new RouteError(401, cb.error_description)
    }

    const { code } = cb

    // get access token
    const auth = OAuthAccessToken.parse(await fetchJson('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers,
      body: JSON.stringify({ client_id, client_secret, code }),
    }))
    if ('error' in auth) throw new RouteError(401, auth.error_description)

    // get user info using the token
    const user = OAuthUser.parse(await fetchJson('https://api.github.com/user', {
      headers: {
        ...headers,
        Authorization: `Bearer ${auth.access_token}`
      }
    }))
    if ('error' in user) throw new RouteError(401, user.error_description)

    const userByEmail = await getUserByEmail(user.email)
    // user has already registered
    if (userByEmail?.oauthGithub) {
      // login user and complete oauth
      await loginUser(ctx, userByEmail.nick)
      return ctx.redirect(302, `${origin}/oauth/complete`)
    }

    // create oauth session
    const id = randomHash()
    const now = new Date()
    const expires = new Date(now)
    expires.setMinutes(expires.getMinutes() + 30)
    kv.set(['oauth', id], {
      login: user.login,
      email: user.email,
      access_token: auth.access_token,
      state
    } satisfies z.infer<typeof OAuthSession>, {
      expireIn: expires.getTime() - now.getTime()
    })

    // redirect user to register, passing the oauth session id
    const url = new URL(`${origin}/oauth/register`)
    url.searchParams.set('id', id)
    const res = ctx.redirect(302, url.href)

    // res.headers.set('set-cookie', createCookie(
    //   'oauth',
    //   id,
    //   expires,
    //   'HttpOnly',
    //   'Secure',
    //   'SameSite=Strict'
    // ))

    return res
  }])
}
