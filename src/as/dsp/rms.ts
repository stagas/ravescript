import { instantiate } from '~/as/build/rms.js'
import url from '~/as/build/rms.wasm?url'
import { hexToBinary } from '~/src/as/init-wasm.ts'

let mod: WebAssembly.Module

if (import.meta.env && import.meta.env.MODE !== 'production') {
  const hex = (await import('~/as/build/rms.wasm?raw-hex')).default
  const wasmMapUrl = new URL('/as/build/rms.wasm.map', location.origin).href
  const binary = hexToBinary(hex, wasmMapUrl)
  mod = await WebAssembly.compile(binary)
}
else {
  mod = await WebAssembly.compileStreaming(fetch(new URL(url, location.href)))
}

export const wasm = await instantiate(mod, {
  env: {
    log: console.log,
  }
})
