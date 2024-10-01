import { z } from 'zod'

const Env = z.object({
  VITE_API_URL: z.string(),
})

export const env = Env.parse(import.meta.env)
