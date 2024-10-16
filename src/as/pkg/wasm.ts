import { instantiate } from '~/as/build/pkg.js'
import url from '~/as/build/pkg.wasm?url'
import { hexToBinary, initWasm } from '~/src/as/init-wasm.ts'

let mod: WebAssembly.Module

if (import.meta.env && import.meta.env.MODE !== 'production') {
  const hex = (await import('~/as/build/pkg.wasm?raw-hex')).default
  const wasmMapUrl = new URL('/as/build/pkg.wasm.map', location.origin).href
  const binary = hexToBinary(hex, wasmMapUrl)
  mod = await WebAssembly.compile(binary)
}
else {
  mod = await WebAssembly.compileStreaming(fetch(new URL(url, location.href)))
}

const wasm = await instantiate(mod, {
  env: {
  }
})

const { alloc } = initWasm(wasm)

export default Object.assign(wasm, { alloc })
