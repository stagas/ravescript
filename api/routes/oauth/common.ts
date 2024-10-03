import { z } from 'zod'
import { Router } from '../../core/router.ts'
import { env } from '../../env.ts'

const OAuthStart = z.object({
  provider: z.enum(['github']),
  redirect_to: z.string().regex(/[a-z0-9/_-]/gi).optional()
})

export function mount(app: Router) {
  const {
    OAUTH_GITHUB_CLIENT_ID: client_id,
  } = env

  app.get('/oauth/start', [ctx => {
    const origin = (
      ctx.request.headers.get('origin') ??
      ctx.request.headers.get('referer') ??
      env.WEB_URL
    ).replace(/\/$/, '')

    const { provider, redirect_to } = OAuthStart.parse(Object.fromEntries(ctx.url.searchParams.entries()))
    switch (provider) {
      case 'github': {
        const url = new URL('https://github.com/login/oauth/authorize')
        url.searchParams.set('client_id', client_id)
        url.searchParams.set('state', [origin, redirect_to ?? '/'].join(','))
        return ctx.redirect(302, url.href)
      }
    }
  }])
}
