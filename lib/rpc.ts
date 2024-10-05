import type { Rpc } from '~/api/rpc/routes.ts'
import { state } from '~/src/state.ts'

export type RpcFn<T extends (...args: never[]) => unknown> =
  T extends (first: never, ...rest: infer U) => infer V
  ? (...args: U) => V
  : never

type RpcMethod = 'GET' | 'POST'
type RpcResponse = {
  error?: string
} | null | undefined

const headers = { 'content-type': 'application/json' }

export function rpc<T extends (...args: any[]) => any>(
  method: RpcMethod,
  fn: string,
) {
  return async function (...args: unknown[]) {
    const url = new URL(`${state.apiUrl}rpc`)

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
