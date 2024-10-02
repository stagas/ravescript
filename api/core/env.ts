import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts'
import { z } from 'zod'
import { IS_DEV } from './constants.ts'

const Env = z.object({
  VITE_API_URL: z.string(),
  WEB_URL: z.string(),
  DATABASE_URL: z.string(),
  RESEND_API_KEY: z.string(),
})

export const env = Env.parse(await load({
  envPath: IS_DEV ? '.env.development' : '.env'
}))
