import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import externalize from "vite-plugin-externalize-dependencies"
import { VitePWA } from 'vite-plugin-pwa'
import TsConfigPaths from 'vite-tsconfig-paths'
import { ViteAssemblyScript } from './vendor/vite-plugin-assemblyscript.ts'
import { BundleUrl } from './vendor/vite-plugin-bundle-url.ts'
import { ViteCoopCoep } from './vendor/vite-plugin-coop-coep.ts'
import { HexLoader } from './vendor/vite-plugin-hex-loader.ts'
import { OpenInEditor } from './vendor/vite-plugin-open-in-editor.ts'
import { ViteUsing } from './vendor/vite-plugin-using.ts'

const root = process.cwd()
const homedir = os.homedir()

type Plugins = (Plugin | Plugin[])[]

// https://vitejs.dev/config/
export default ({ mode }) => {
  loadEnv(mode, root)

  const https = mode === 'development' ? {
    key: fs.readFileSync(path.join(homedir, '.ssl-certs', 'devito.test-key.pem')),
    cert: fs.readFileSync(path.join(homedir, '.ssl-certs', 'devito.test.pem')),
  } : undefined

  const sharedPlugins: () => Plugins = () => [
    ViteUsing(),
    HexLoader(),
    TsConfigPaths(),
  ]

  const buildPlugins: Plugins = [
    ...sharedPlugins(),
    BundleUrl({
      plugins: sharedPlugins()
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/service-worker',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        id: '/',
        name: 'Vasi',
        short_name: 'Vasi',
        description: 'Vasi is a full-stack webapp base template using Deno and Vite.',
        theme_color: '#000000',

        icons: [{
          src: 'pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png',
        }, {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        }, {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        }, {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }],
      },

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },

      devOptions: {
        enabled: true,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    })
  ]

  const plugins: Plugins = [
    ...buildPlugins,
    OpenInEditor(),
    ViteCoopCoep(),
    externalize({
      externals: [
        'node:fs/promises',
        (moduleName) => moduleName.startsWith('node:')
      ],
    }),
    ViteAssemblyScript({
      configFile: 'asconfig-pkg.json',
      projectRoot: '.',
      srcMatch: 'as/assembly/pkg',
      srcEntryFile: 'as/assembly/pkg/index.ts',
      mapFile: './as/build/pkg.wasm.map',
      extra: [
        '--transform', './vendor/as-transform-unroll.js',
      ]
    }),
  ]

  return defineConfig({
    clearScreen: false,
    server: {
      host: 'devito.test',
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
    worker: {
      format: 'es'
    },
    plugins,
    build: {
      target: 'esnext',
      minify: false,
      rollupOptions: {
        input: {
          main: path.join(root, 'index.html'),
          admin: path.join(root, 'admin/index.html'),
        },
        treeshake: { propertyReadSideEffects: 'always' },
        plugins: buildPlugins
      },
    },
  })
}
