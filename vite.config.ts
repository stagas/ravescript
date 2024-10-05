import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import Paths from 'vite-tsconfig-paths'
import { OpenInEditor } from './vendor/vite-plugin-open-in-editor.ts'
import { ViteUsing } from './vendor/vite-plugin-using.ts'

const root = process.cwd()
const homedir = os.homedir()

// https://vitejs.dev/config/
export default ({ mode }) => {
  loadEnv(mode, root)
  const https = mode === 'development' ? {
    key: fs.readFileSync(path.join(homedir, '.ssl-certs', 'devito.test-key.pem')),
    cert: fs.readFileSync(path.join(homedir, '.ssl-certs', 'devito.test.pem')),
  } : undefined
  return defineConfig({
    clearScreen: false,
    server: {
      host: true,
      fs: {
        allow: [
          '/',
        ]
      },
      https
    },
    esbuild: {
      jsx: 'automatic',
      target: 'esnext',
      treeShaking: true
    },
    plugins: [
      Paths(),
      ViteUsing(),
      OpenInEditor(),
    ],
    build: {
      rollupOptions: {
        input: {
          main: path.join(root, 'index.html'),
          admin: path.join(root, 'admin/index.html'),
        },
      },
    },
  })
}
