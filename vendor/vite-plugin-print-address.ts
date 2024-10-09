import { Plugin } from 'vite'
import os from 'node:os'
// @ts-ignore
import qrcode from 'qrcode-terminal'

export function getNetworkAddress(options: { port: string }) {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses!) {
      const { address: host, family, internal } = address
      if (!internal && family === 'IPv4') {
        return `https://${host}:${options.port}`
      }
    }
  }
  return '-'
}

export const VitePrintAddress = (): Plugin => ({
  name: 'print-address',
  configureServer(server) {
    let timeout: any
    const printUrls = (origin: string) => {
      clearTimeout(timeout)
      const url = new URL(origin)
      const { port } = url
      timeout = setTimeout(() => {
        const network = getNetworkAddress({ port })
        qrcode.generate(network, { small: true })
        console.log(url.href)
        console.log(network)
      }, 500)
    }
    server.middlewares.use(async (req, res, next) => {
      if (req.headers.origin) printUrls(req.headers.origin)
      next()
    })
  },
})
