import { z } from 'zod'
import { createCookie } from '../../../node_modules/utils/src/cookies.ts'
import { randomHash } from '../../../node_modules/utils/src/random-hash.ts'
import { getUserByEmail, loginUser } from '../../actions/login-register.ts'
import { kv } from '../../core/app.ts'
import { fetchJson } from '../../core/fetch-json.ts'
import { RouteError, Router } from '../../core/router.ts'
import { env } from '../../env.ts'

const OAuthError = z.object({
  error: z.string(),
  error_description: z.string(),
  error_uri: z.string()
})

const OAuthCallback = z.union([
  z.object({
    code: z.string(),
    state: z.string().optional()
  }),
  OAuthError
])

export const OAuthLogin = z.object({
  login: z.string().optional(),
  email: z.string(),
  access_token: z.string(),
  redirect_to: z.string(),
})
export type OAuthLogin = z.infer<typeof OAuthLogin>

const OAuthAccessToken = z.union([
  z.object({
    access_token: z.string(),
    scope: z.string(),
    token_type: z.string()
  }),
  OAuthError
])

const OAuthUser = z.union([
  z.object({
    login: z.string(),
    email: z.string(),
  }),
  OAuthError
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

  app.get('/oauth/github', [async ctx => {
    const cb = OAuthCallback.parse(Object.fromEntries(ctx.url.searchParams.entries()))
    if ('error' in cb) throw new RouteError(401, cb.error_description)

    const { code, state } = cb
    const redirect_to = state ?? '/'

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
      await loginUser(ctx, userByEmail.nick)
      const url = new URL(`${env.WEB_URL}/oauth/complete`)
      url.searchParams.set('redirect_to', redirect_to)
      const res = ctx.redirect(302, url.href)
      return res
    }

    // save login session
    const id = `github-${randomHash()}`
    const now = new Date()
    const expires = new Date(now)
    expires.setMinutes(expires.getMinutes() + 30)

    kv.set(['oauth', id], {
      login: user.login,
      email: user.email,
      access_token: auth.access_token,
      redirect_to
    } satisfies z.infer<typeof OAuthLogin>, {
      expireIn: expires.getTime() - now.getTime()
    })

    // redirect user to register
    const url = new URL(`${env.WEB_URL}/oauth/register`)
    url.searchParams.set('id', id)
    const res = ctx.redirect(302, url.href)

    res.headers.set('set-cookie', createCookie(
      'oauth',
      id,
      expires,
      'HttpOnly',
      'Secure',
      'SameSite=Strict'
    ))

    return res
  }])
}
