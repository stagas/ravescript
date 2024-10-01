import { timeMs } from 'utils'
import { logger, session } from './middleware.ts'
import { create } from './router.ts'

function log(...args: unknown[]) {
  const now = new Date()
  return console.log(`\x1b[02m${timeMs(now)}\x1b[0m`, ...args)
}

export const kv = await Deno.openKv()
export const app = create({ log })

app.use(null, [logger])
app.use(null, [session])
