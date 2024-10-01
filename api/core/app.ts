import { timeMs } from 'utils'
import { Router } from './router.ts'

function log(...args: unknown[]) {
  const now = new Date()
  return console.log(`\x1b[02m${timeMs(now)}\x1b[0m`, ...args)
}

export const kv = await Deno.openKv()
export const app = Router({ log })
