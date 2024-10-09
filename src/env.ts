import { z } from 'zod'

const Env = z.object({
  VITE_API_URL: z.string(),
})

export const env = Env.parse(Object.assign({
  VITE_API_URL: location.origin
}, import.meta.env))

const url = new URL(location.origin)
if (url.port.length) {
  url.port = '8000'
  env.VITE_API_URL = url.href.slice(0, -1) // trim trailing slash
}
