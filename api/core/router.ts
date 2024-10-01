import { defer, parseCookie } from 'utils'
import { z } from 'zod'
import { env } from './env.ts'
import { match } from './match.ts'

const headers: Record<string, string> = {
  'access-control-allow-origin': env.WEB_URL,
  'access-control-allow-methods': 'GET, HEAD, OPTIONS, POST, PUT',
  'access-control-allow-headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  'access-control-allow-credentials': 'true',
}

export type Context = {
  log: typeof console.log
  request: Request
  info: Deno.ServeHandlerInfo
  url: URL
  cookies: Record<string, string>
  params: Partial<Record<string, string | string[]>>
  parseForm<T extends z.AnyZodObject>(this: Context, schema: T): Promise<z.infer<T>>
  parseJson<T extends z.AnyZodObject>(this: Context, schema: T): Promise<z.infer<T>>
  redirect: typeof redirect
  done: Promise<Response>
}

export type Handler = (ctx: Context) => string | void | Response | Promise<string | void | Response>

interface Route {
  method: string
  handle: Handler
}

function redirect(status: number, location: string) {
  return new Response(null, { status, headers: { location } })
}

function toResponse(x: string | Response) {
  if (typeof x === 'string') x = new Response(x, { headers: { 'content-type': 'text/html' } })
  return x
}

async function parseForm<T extends z.AnyZodObject>(this: Context, schema: T) {
  const form = await this.request.formData()
  const data = Object.fromEntries(form.entries())
  return schema.parse(data) as z.infer<T>
}

async function parseJson<T extends z.AnyZodObject>(this: Context, schema: T) {
  const data = await this.request.json()
  return schema.parse(data) as z.infer<T>
}

export type Router = ReturnType<typeof Router>
export function Router({ log = console.log }: { log?: typeof console.log } = {}) {
  const routes: Route[] = []

  async function handler(req: Request, info: Deno.ServeHandlerInfo) {
    using deferred = defer<Response>(() => {
      if (!response) response = new Response('Server Error', { status: 500 })
      for (const k in headers) response.headers.set(k, headers[k])
      return response
    })

    let res: string | void | Response
    let response!: Response

    const ctx: Context = {
      log,
      request: req,
      info: info,
      url: new URL(req.url),
      cookies: parseCookie(req.headers.get('cookie') ?? ''),
      params: {},
      parseForm,
      parseJson,
      redirect,
      done: deferred.promise,
    }

    for (const { method, handle } of routes) {
      if (method === 'USE' || method === req.method) {
        res = await handle(ctx)
        if (res) return response = toResponse(res)
      }
    }

    return response = new Response('Not Found', { status: 404 })
  }

  function handle(path: string | null, fns: Handler[]): Handler {
    const matcher = path && match(path)
    return async function handler(ctx) {
      let m: ReturnType<ReturnType<typeof match>> | undefined
      if (matcher) m = matcher(ctx.url.pathname)
      if (path === null || m) {
        ctx.params = m && m.params || {}
        for (const fn of fns) {
          const res = await fn(ctx)
          if (res != null) return res
        }
        if (!m && path !== null) return
      }
    }
  }

  function route(method: string) {
    return function addRoute(path: string | null, fns: Handler[]) {
      routes.push({ method, handle: handle(path, fns) })
    }
  }

  return {
    log,
    use: route('USE'),
    get: route('GET'),
    post: route('POST'),
    options: route('OPTIONS'),
    routes,
    handler,
  }
}
