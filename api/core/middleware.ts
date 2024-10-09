import * as media from 'jsr:@std/media-types'
import * as path from 'jsr:@std/path'
import { getUserByNick } from '~/api/auth/actions.ts'
import { UserSession } from '~/api/auth/types.ts'
import { kv } from "~/api/core/app.ts"
import type { Handler } from '~/api/core/router.ts'
import { sessions } from "~/api/core/sessions.ts"
import { env } from '~/api/env.ts'
import { IS_DEV } from '~/api/core/constants.ts'

const DEBUG = false
const ORIGIN_REGEX = /(https:\/\/[^\/\n]+\.deno\.dev)/g

export const cors: Handler = ctx => {
  ctx.done.then(res => {
    const origin =
      ctx.request.headers.get('origin') ??
      ctx.request.headers.get('referer')

    if (!ctx.request.headers.get('upgrade') && origin) {
      if (IS_DEV) {
        res.headers.set('access-control-allow-origin', origin)
        return
      }

      const [match] = origin.match(ORIGIN_REGEX) ?? []
      if (match) {
        res.headers.set('access-control-allow-origin', match)
      }
      else if (
        origin.startsWith(env.WEB_URL) ||
        origin.startsWith(env.VITE_API_URL)
      ) {
        res.headers.set('access-control-allow-origin', origin)
      }
    }
  })
}

export const watcher: Handler = () => {
  const body = new ReadableStream()
  return new Response(body, {
    headers: {
      'content-type': 'text/event-stream',
    },
  })
}

export const logger: Handler = ctx => {
  const before = new Date()
  ctx.done.then(res => {
    const now = new Date()
    const sec = ((now.getTime() - before.getTime()) * 0.001).toFixed(3)
    const session = sessions.get(ctx)
    ctx.log(
      res.status,
      `\x1b[01m${ctx.request.method} ${ctx.url.pathname + ctx.url.search}\x1b[0m`,
      `\x1b[34m${sec}\x1b[0m`,
      session?.nick ?? 'guest',
    )
  })
}

export const session: Handler = async ctx => {
  if (ctx.cookies.session) {
    DEBUG && ctx.log('Get session:', ctx.cookies.session)
    const entry = await kv.get(['session', ctx.cookies.session])
    if (entry.value) {
      const session = UserSession.parse(entry.value)
      if (session.expires.getTime() > Date.now()) {
        const user = await getUserByNick(session.nick)
        if (user) sessions.set(ctx, session)
      }
    }
  }
}

export const files = (root: string): Handler => async ctx => {
  const { pathname } = ctx.url
  let file
  let filepath
  let error
  out:
  try {
    filepath = path.join(pathname, 'index.html')
    file = await Deno.open(`${root}${filepath}`, { read: true })
  }
  catch {
    try {
      filepath = pathname
      file = await Deno.open(`${root}${filepath}`, { read: true })
      break out
    }
    catch (e) {
      error = e
      if (e instanceof Deno.errors.NotFound) {
        try {
          filepath = '/index.html'
          file = await Deno.open(`${root}${filepath}`, { read: true })
          break out
        }
        catch (e) {
          error = e
        }
      }
      ctx.log('Error serving:', filepath, error)
    }
    return new Response(null, { status: 500 })
  }

  DEBUG && ctx.log('Serve:', filepath)

  return new Response(file.readable, {
    headers: {
      'content-type': media.typeByExtension(path.extname(filepath)) ?? 'text/plain'
    }
  })
}
