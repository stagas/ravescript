import { build, createLogger, type Plugin, type UserConfig } from 'vite'

export function BundleUrl({ plugins }: { plugins: (Plugin | Plugin[])[] }): Plugin {
  let viteConfig: UserConfig

  return {
    name: 'vite-plugin-bundle-url',
    apply: 'build',
    enforce: 'post',

    config(config) {
      viteConfig = config
    },

    async transform(_code, id) {
      if (!id.endsWith('.ts?url')) return

      const quietLogger = createLogger()
      quietLogger.info = () => undefined

      const output = await build({
        ...viteConfig,
        configFile: false,
        clearScreen: false,
        customLogger: quietLogger,
        build: {
          ...viteConfig?.build,
          lib: {
            entry: id.replace('?url', ''),
            name: '_',
            formats: ['iife'],
          },
          rollupOptions: {
            plugins
          },
          write: false,
        },
      })

      if (!Array.isArray(output)) return

      const iife = output[0].output[0].code
      const encoded = Buffer.from(iife, 'utf8').toString('base64')
      const transformed = `export default "data:text/javascript;base64,${encoded}";`

      console.log(
        `[bundle-url] ${id} (${transformed.length} bytes)`,
      )

      return transformed
    },
  }
}
