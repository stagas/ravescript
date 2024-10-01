import { z } from 'zod'
import { app } from '../core/app.ts'
import { sessions } from '../core/sessions.ts'
import { defer } from 'utils'

export type Rpc = z.infer<typeof Rpc>
export const Rpc = z.object({
  fn: z.string(),
  args: z.array(z.unknown()),
})

// deno-lint-ignore no-explicit-any
export const actions: Record<string, (...args: any[]) => unknown | Promise<unknown>> = {}

export class RpcError extends Error {
  declare cause: { status: number }
  constructor(status: number, message: string) {
    super(message, { cause: { status } })
  }
}

const headers = { 'content-type': 'application/javascript' }

app.options('/rpc', [() => new Response(null, {
  headers: { 'allow': 'POST' }
})])

app.post('/rpc', [async ctx => {
  const { fn, args } = await ctx.parseJson(Rpc)

  const action = actions[fn]
  if (!action) throw new Error('Rpc call not found: ' + fn)

  const before = new Date()
  using _ = defer(() => {
    const now = new Date()
    const sec = ((now.getTime() - before.getTime()) * 0.001).toFixed(3)
    const session = sessions.get(ctx)
    ctx.log(
      'Rpc:',
      `\x1b[35m\x1b[01m${fn}\x1b[0m`,
      `\x1b[34m${sec}\x1b[0m`,
      session?.nick ?? 'guest'
    )
  })

  args.unshift(ctx)

  try {
    const result = (await action.apply(null, args)) ?? {}
    return new Response(JSON.stringify(result), {
      headers
    })
  }
  catch (error) {
    if (error instanceof RpcError) {
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
