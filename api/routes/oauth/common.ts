import { z } from 'zod'
import { Router } from '../../core/router.ts'
import { env } from '../../env.ts'
import { randomHash } from 'utils'
import { kv } from '../../core/app.ts'

const OAuthStart = z.object({
  provider: z.enum(['github']),
})

export const OAuthState = z.object({
  origin: z.string(),
  provider: z.string(),
})

export function mount(app: Router) {
  const {
    OAUTH_GITHUB_CLIENT_ID: client_id,
  } = env

  app.get('/oauth/start', [async ctx => {
    const { provider } = OAuthStart.parse(
      Object.fromEntries(ctx.url.searchParams.entries())
    )

    const origin = (
      ctx.request.headers.get('referer') ??
      env.WEB_URL
    ).replace(/\/$/, '')

    ctx.log('OAuth origin:', origin)

    const state = OAuthState.parse({
      origin,
      provider,
    })

    const oauthStateId = randomHash()
    await kv.set(['oauthState', oauthStateId], state, {
      expireIn: 30 * 60 * 1000
    })

    switch (provider) {
      case 'github': {
        const url = new URL('https://github.com/login/oauth/authorize')
        url.searchParams.set('client_id', client_id)
        url.searchParams.set('state', oauthStateId)
        return ctx.redirect(302, url.href)
      }
    }
  }])
}
