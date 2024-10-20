import { instantiate } from '~/as/build/dsp.js'
import url from '~/as/build/dsp.wasm?url'
import { hexToBinary, initWasm } from '~/src/as/init-wasm.ts'

let mod: WebAssembly.Module

if (import.meta.env && import.meta.env.MODE !== 'production') {
  const hex = (await import('~/as/build/dsp.wasm?raw-hex')).default
  const wasmMapUrl = new URL('/as/build/dsp.wasm.map', location.origin).href
  const binary = hexToBinary(hex, wasmMapUrl)
  mod = await WebAssembly.compile(binary)
}
else {
  mod = await WebAssembly.compileStreaming(fetch(new URL(url, location.href)))
}

const wasmInstance = await instantiate(mod, {
  env: {
    log: console.warn,
  }
})

const { alloc } = initWasm(wasmInstance)

export const wasm = Object.assign(wasmInstance, { alloc })
