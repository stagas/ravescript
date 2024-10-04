import { randomHash } from 'utils'
import { z } from 'zod'
import { kv } from '../../core/app.ts'
import { Router } from '../../core/router.ts'
import { env } from '../../env.ts'

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

    ctx.log('OAuth origin:', ctx.origin)

    const state = OAuthState.parse({
      origin: ctx.origin,
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
