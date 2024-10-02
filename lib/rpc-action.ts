import type { Rpc } from '../api/routes/rpc.ts'
import { env } from '../src/env.ts'

export type RpcFn<T extends (...args: never[]) => unknown> =
  T extends (first: never, ...rest: infer U) => infer V
  ? (...args: U) => V
  : never

type RpcMethods = 'GET' | 'POST'
type RpcResponse = {
  error?: string
} | null | undefined

const headers = { 'content-type': 'application/json' }

export function rpcAction<T extends (...args: any[]) => any>(
  method: RpcMethods,
  fn: string,
) {
  return async function (...args: unknown[]) {
    const api = import.meta.env.DEV ? env.VITE_API_URL : location.origin
    const url = new URL(api + '/rpc')

    url.searchParams.set('fn', fn)

    const init: RequestInit = {
      method,
      headers,
      credentials: 'include',
    }

    switch (method) {
      case 'GET':
        for (const arg of args) {
          url.searchParams.append('args', JSON.stringify(arg))
        }
        break

      case 'POST':
        init.body = JSON.stringify({ args } satisfies Rpc)
        break
    }

    const res = await fetch(url, init)

    const json = await res.json() as RpcResponse

    if (json?.error) {
      throw new Error(json.error)
    }

    return json as never
  } as RpcFn<T>
}
