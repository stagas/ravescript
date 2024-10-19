import { wasmSourceMap, type TypedArray, type TypedArrayConstructor } from 'utils'

const DEBUG = false

interface Wasm {
  memory: WebAssembly.Memory
  __pin(ptr: number): number
  __unpin(ptr: number): void
  __new(size: number, id: number): number
  __collect(): void
  allocI32(bytes: number): number
  allocU32(bytes: number): number
  allocF32(bytes: number): number
}

function fromHexString(hexString: string) {
  return Uint8Array.from(
    hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  )
}

export function hexToBinary(hex: string, wasmMapUrl: string) {
  const uint8 = fromHexString(hex)
  const buffer = wasmSourceMap.setSourceMapURL(uint8.buffer, wasmMapUrl)
  const binary = new Uint8Array(buffer)
  return binary
}

export function initWasm(wasm: Wasm) {
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
  const GC_EVERY = 81920
  let allocs = 0

  const funcs = new Map([
    [Int32Array, wasm.allocI32],
    [Uint32Array, wasm.allocU32],
    [Float32Array, wasm.allocF32],
  ] as any) as any

  function alloc<T extends TypedArrayConstructor>(ctor: T, length: number) {
    const bytes = length * ctor.BYTES_PER_ELEMENT

    allocs += length
    if (allocs > GC_EVERY) {
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
    if (+new Date() - +new Date(performance.timeOrigin) > 5_000) {
      location.href = location.href
    }

    throw new Error('Cannot allocate wasm memory.')
  }

  return { alloc }
}
