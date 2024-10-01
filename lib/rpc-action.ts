import type { Rpc } from '../api/routes/rpc.ts'
import { env } from '../src/env.ts'

export type RpcFn<T extends (...args: never[]) => unknown> =
  T extends (first: never, ...rest: infer U) => infer V
  ? (...args: U) => V
  : never

type RpcResponse = {
  error?: string
} | null | undefined

export function rpcAction<T extends (...args: any[]) => any>(fn: string) {
  return async function (...args: any[]) {
    const body: Rpc = { fn, args }
    const res = await fetch(env.VITE_API_URL + '/rpc', {
      credentials: 'include',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json() as RpcResponse
    if (json?.error) {
      throw new Error(json.error)
    }
    return json as never
  } as RpcFn<T>
}
