import os from 'node:os'
import path from 'node:path'
import { Plugin } from 'vite'

// @ts-ignore
import openInEditor from 'open-in-editor'

const editor: { open(filename: string): Promise<void> } = openInEditor.configure({
  editor: 'code',
  dotfiles: 'allow',
})

export const ViteOpenInEditor = (): Plugin => ({
  name: 'open-in-editor',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.method !== 'POST') return next()

      const fsPath = req.url!.slice(1).replace('@fs', '')
      const homedir = os.homedir()

      console.log('[open-in-editor]', fsPath)

      let filename: string
      if (fsPath.startsWith(homedir)) {
        filename = fsPath
      }
      else {
        filename = path.join(process.cwd(), fsPath)
      }
      try {
        await editor.open(filename)
      }
      catch (error) {
        res.statusCode = 500
        res.end((error as Error).message)
        return
      }

      res.statusCode = 200
      res.setHeader('content-type', 'text/html')
      res.end('<script>window.close()</script>')
    })
  },
})
