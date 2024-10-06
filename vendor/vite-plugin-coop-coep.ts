import type { Plugin } from 'vite'

export function ViteCoopCoep(): Plugin {
  return {
    name: 'coop-coep',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        next()
      })
    },
  }
}
