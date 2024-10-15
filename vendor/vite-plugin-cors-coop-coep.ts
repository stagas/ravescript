import type { Plugin } from 'vite'

export function ViteCorsCoopCoep(): Plugin {
  return {
    name: 'cors-coop-coep',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('access-control-allow-origin', req.headers.origin ?? '*')
        res.setHeader('cross-origin-opener-policy', 'same-origin')
        res.setHeader('cross-origin-embedder-policy', 'require-corp')
        next()
      })
    },
  }
}
