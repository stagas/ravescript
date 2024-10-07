import type { Plugin } from 'vite'

export function ViteCoopCoep(): Plugin {
  return {
    name: 'coop-coep',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('cross-origin-opener-policy', 'same-origin')
        res.setHeader('cross-origin-embedder-policy', 'require-corp')
        next()
      })
    },
  }
}
