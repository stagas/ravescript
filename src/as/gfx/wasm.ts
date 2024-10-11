import { instantiate } from '~/as/build/gfx.js'
import url from '~/as/build/gfx.wasm?url'
import { hexToBinary, initWasm } from '~/src/as/init-wasm.ts'

let mod: WebAssembly.Module

if (import.meta.env && import.meta.env.MODE !== 'production') {
  const hex = (await import('~/as/build/gfx.wasm?raw-hex')).default
  const wasmMapUrl = new URL('/as/build/gfx.wasm.map', location.origin).href
  const binary = hexToBinary(hex, wasmMapUrl)
  mod = await WebAssembly.compile(binary)
}
else {
  mod = await WebAssembly.compileStreaming(fetch(new URL(url, location.href)))
}

let flushSketchFn = (count: number) => { }
function setFlushSketchFn(fn: (count: number) => void) {
  flushSketchFn = fn
}

const wasmInstance = await instantiate(mod, {
  env: {
    log: console.log,
    flushSketch(count: number) {
      flushSketchFn(count)
    }
  }
})

const { alloc } = initWasm(wasmInstance)

export const wasm = Object.assign(wasmInstance, { alloc, setFlushSketchFn })
