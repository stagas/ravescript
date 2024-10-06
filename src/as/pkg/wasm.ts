import { wasmSourceMap, type TypedArray, type TypedArrayConstructor } from 'utils'
import { instantiate } from '~/as/build/pkg.js'
import url from '~/as/build/pkg.wasm?url'

const DEBUG = false

const { log } = console

let mod: WebAssembly.Module

if (import.meta.env && import.meta.env.MODE !== 'production') {
  const hex = (await import('~/as/build/pkg.wasm?raw-hex')).default
  const fromHexString = (hexString: string) => Uint8Array.from(
    hexString.match(/.{1,2}/g)!.map(byte =>
      parseInt(byte, 16)
    )
  )
  const wasmMapUrl = new URL('/as/build/pkg.wasm.map', location.origin).href
  const uint8 = fromHexString(hex)
  const buffer = wasmSourceMap.setSourceMapURL(uint8.buffer, wasmMapUrl)
  const binary = new Uint8Array(buffer)
  mod = await WebAssembly.compile(binary)
}
else {
  mod = await WebAssembly.compileStreaming(fetch(new URL(url, location.href)))
}

const wasm = await instantiate(mod, {
  env: {
    log,
  }
})

const reg = new FinalizationRegistry((ptr: number) => {
  lru.delete(ptr)
  try {
    DEBUG && console.log('Freeing', ptr)
    wasm.__unpin(ptr)
  }
  catch (error) {
    console.error('Failed free:', ptr, error)
  }
})

let lru = new Set<number>()
const TRIES = 16
const GC_EVERY = 1024000
let allocs = 0

const funcs = new Map([
  [Int32Array, wasm.allocI32],
  [Uint32Array, wasm.allocU32],
  [Float32Array, wasm.allocF32],
] as any) as any

function alloc<T extends TypedArrayConstructor>(ctor: T, length: number) {
  const bytes = length * ctor.BYTES_PER_ELEMENT
  // console.warn('[player] alloc', length)
  allocs += length
  if (allocs > GC_EVERY) {
    // console.log('[player gc]')
    wasm.__collect()
    allocs = 0
  }

  do {
    try {
      const ptr = funcs.has(ctor)
        ? wasm.__pin(funcs.get(ctor)(length))
        : wasm.__pin(wasm.__new(bytes, 1))
      const arr = new ctor(wasm.memory.buffer, ptr, length)
      const unreg = {}
      reg.register(arr, ptr, unreg)
      return Object.assign(arr as TypedArray<T>, {
        ptr,
        free() {
          reg.unregister(unreg)
          lru.delete(ptr)
          try {
            wasm.__unpin(ptr)
          }
          catch (error) {
            console.warn(error)
          }
        }
      })
    }
    catch (err) {
      console.error(err)
      console.error('Failed alloc:', bytes, ' - will attempt to free memory.')
      const [first, ...rest] = lru
      lru = new Set(rest)
      try {
        wasm.__unpin(first)
      }
      catch (error) {
        console.warn(error)
      }
      // wasm.__collect()
      continue
    }
  } while (lru.size)

  //
  // NOTE: We can't allocate any wasm memory.
  //  This is a catastrophic error so we choose to _refresh_ the page.
  //  Might not be ideal in all situations.
  // We shouldn't refresh if the failure is right after a new refresh,
  // otherwise we enter into infinite refreshes loop.
  if (+new Date() - +new Date(performance.timeOrigin) > 2_000) {
    location.href = location.href
  }

  throw new Error('Cannot allocate wasm memory.')
}

export default Object.assign(wasm, { alloc })

if (import.meta.vitest) {
  describe('alloc', () => {
    it('works', () => {
      const buf = alloc(Float32Array, 32)
      expect(buf.length).toBe(32)
      expect(buf).toBeInstanceOf(Float32Array)
    })
  })
}
