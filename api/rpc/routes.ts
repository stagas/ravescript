import { defer } from 'utils'
import { z } from 'zod'
import { RouteError, type Router } from '~/api/core/router.ts'
import { sessions } from '~/api/core/sessions.ts'

const DEBUG = false

export type Rpc = z.infer<typeof Rpc>
export const Rpc = z.object({
  args: z.array(z.unknown()),
})

// deno-lint-ignore no-explicit-any
type Actions = Record<string, (...args: any[]) => unknown | Promise<unknown>>

export const actions = {
  get: {} as Actions,
  post: {} as Actions,
}

const headers = { 'content-type': 'application/javascript' }

export function mount(app: Router) {
  app.use('/rpc', [async ctx => {
    const url = new URL(ctx.request.url)
    const fn: string | null = url.searchParams.get('fn')
    if (!fn) throw new RouteError(400, 'Missing function name')

    let args: unknown[]

    switch (ctx.request.method) {
      case 'OPTIONS':
        return new Response(null, {
          headers: { 'allow': 'GET, POST' }
        })

      case 'GET': {
        args = url.searchParams.getAll('args').map(s => JSON.parse(s))
        break
      }

      case 'POST': {
        const json = await ctx.parseJson(Rpc)
        args = json.args
        break
      }

      default:
        throw new RouteError(405, 'Method not allowed')
    }

    const method = ctx.request.method.toLowerCase() as 'get'
    const action = actions[method][fn]
    if (!action) throw new Error(`Rpc call not found: ${method} ${fn}`)

    const before = new Date()
    using _ = defer(() => {
      const now = new Date()
      const sec = ((now.getTime() - before.getTime()) * 0.001).toFixed(3)
      const session = sessions.get(ctx)
      DEBUG && ctx.log(
        'Rpc:',
        `\x1b[35m\x1b[01m${fn}\x1b[0m`,
        `\x1b[34m${sec}\x1b[0m`,
        session?.nick ?? 'guest'
      )
    })

    args.unshift(ctx)

    try {
      const result = await action.apply(null, args)
      return new Response(JSON.stringify(result ?? null), {
        headers
      })
    }
    catch (error) {
      console.error(error)
      if (error instanceof RouteError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: error.cause.status,
          headers
        })
      }
      else {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        })
      }
    }
  }])
}
