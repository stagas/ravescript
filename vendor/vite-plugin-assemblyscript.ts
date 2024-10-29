// Forked from https://github.com/ed-25519/vite-plugin-assemblyscript-asc/blob/main/src/index.ts
import asc from 'assemblyscript/dist/asc'
import fs from 'fs'
import type { SourceMapPayload } from 'module'
import { join, resolve } from 'path'
import { createConcurrentQueue } from 'utils'
import type { Plugin } from 'vite'

interface AssemblyScriptPluginOptions {
  projectRoot: string
  configFile: string
  srcMatch: string
  srcEntryFile: string
  mapFile: string
  sourceRoot: string
  extra: string[]
}

const defaultOptions: AssemblyScriptPluginOptions = {
  projectRoot: '.',
  sourceRoot: '/',
  configFile: 'asconfig.json',
  srcMatch: 'as/assembly',
  srcEntryFile: 'as/assembly/index.ts',
  mapFile: './as/build/assembly.wasm.map',
  extra: []
}

async function compile(entryFile: string, mode: 'debug' | 'release', options: AssemblyScriptPluginOptions) {
  console.log('[asc] compiling...')

  const { error, stdout, stderr, stats } = await asc.main([
    entryFile,
    '--config', options.configFile,
    '--target', mode,
    ...(options.extra.flat(Infinity)),
  ], {})

  if (error) {
    console.log('Compilation failed: ' + error.message)
    console.log(stdout.toString())
    console.log(stderr.toString())
  }
  else {
    console.log(stdout.toString())
    console.log(stats.toString())
    const mapFile = join(options.projectRoot, options.mapFile)
    const mapJson = fs.readFileSync(mapFile, 'utf-8')
    const map = JSON.parse(mapJson) as SourceMapPayload

    // This is the magic that makes paths work for open-in-editor from devtools console.
    map.sourceRoot = options.sourceRoot

    fs.writeFileSync(mapFile, JSON.stringify(map), 'utf-8')
  }
}

const queue: (() => Promise<void>)[] = []
let promise: Promise<void> | null = null
async function flush() {
  if (promise) return promise
  async function run() {
    let task: (() => Promise<void>) | undefined
    while (task = queue.pop()) {
      await task()
    }
  }
  promise = run()
  await promise
  promise = null
}

export function ViteAssemblyScript(
  userOptions: Partial<AssemblyScriptPluginOptions> = defaultOptions
): Plugin {
  const options = {
    ...defaultOptions,
    ...userOptions,
  }

  const entryFile = join(options.projectRoot, options.srcEntryFile)
  const matchPath = resolve(join(options.projectRoot, options.srcMatch))

  let handledTimestamp: any
  let didBuild = false

  return {
    name: 'vite-plugin-assemblyscript',
    async handleHotUpdate({ file, timestamp }) {
      if (file.startsWith(matchPath)) {
        if (timestamp === handledTimestamp) return
        handledTimestamp = timestamp
        queue.push(async () => {
          await compile(entryFile, 'debug', options)
        })
        await flush()
      }
    },
    async buildStart() {
      if (didBuild) return
      didBuild = true
      queue.push(async () => {
        await compile(entryFile, 'release', options)
      })
      await flush()
    },
  }
}
