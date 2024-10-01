import type { Rpc } from '../api/routes/rpc.ts'
import { env } from '../src/env.ts'

export type RpcFn<T extends (...args: never[]) => unknown> =
  T extends (first: never, ...rest: infer U) => infer V
  ? (...args: U) => V
  : never

type RpcResponse = {
  error?: string
}

export function rpcAction<T extends (...args: any[]) => any>(fn: string) {
  return async function (...args: any[]) {
    const res = await fetch(env.VITE_API_URL + '/rpc', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fn,
        args,
      } satisfies Rpc),
    })
    const json = await res.json() as RpcResponse
    if (json.error) {
      throw new Error(json.error)
    }
    return json as never
  } as RpcFn<T>
}
