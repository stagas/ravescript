/// <reference types="vitest" />

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { OpenInEditor } from './vendor/vite-plugin-open-in-editor.ts'
import { ViteUsing } from './vendor/vite-plugin-using.ts'

const root = process.cwd()
const homedir = os.homedir()

// https://vitejs.dev/config/
export default ({ mode }) => {
  loadEnv(mode, root)
  return defineConfig({
    clearScreen: false,
    test: {
      globals: true,
      includeSource: ['src/**/*.{js,jsx,ts,tsx}'],
    },
    define: {
      'import.meta.vitest': 'undefined',
    },
    server: {
      host: true,
      fs: {
        allow: [
          '/',
        ]
      },
      https: {
        key: fs.readFileSync(path.join(homedir, '.ssl-certs', 'devito.test-key.pem')),
        cert: fs.readFileSync(path.join(homedir, '.ssl-certs', 'devito.test.pem')),
      }
    },
    esbuild: {
      jsx: 'automatic',
      target: 'esnext',
      treeShaking: true
    },
    plugins: [
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
