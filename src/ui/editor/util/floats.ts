import { wasm } from 'gfx'
import { WAVE_MIPMAPS } from '~/as/assembly/gfx/sketch-shared.ts'

export type Floats = ReturnType<typeof Floats>

export function Floats(waveform: Float32Array) {
  const len = waveform.length

  const targets = Array.from({ length: WAVE_MIPMAPS }, (_, i) => ({
    divisor: 2 ** (i + 1),
    len: 0,
    ptr: 0
  }))

  const size = targets.reduce((p, n) => {
    n.ptr = p
    n.len = Math.floor(len / n.divisor)
    return n.ptr + n.len
  }, len)

  const floats = Object.assign(
    wasm.alloc(Float32Array, size),
    { len }
  )
  floats.set(waveform)

  for (const { divisor, len, ptr } of targets) {
    for (let n = 0; n < len; n++) {
      const n0 = Math.floor(n * divisor)
      const n1 = Math.ceil((n + 1) * divisor)

      let min = Infinity, max = -Infinity
      let s
      for (let i = n0; i < n1; i++) {
        s = waveform[i]
        if (s < min) min = s
        if (s > max) max = s
      }

      if (
        !isFinite(min) &&
        !isFinite(max)
      ) min = max = 0

      if (!isFinite(min)) min = max
      if (!isFinite(max)) max = min

      const p = ptr + n
      floats[p] = Math.abs(min) > Math.abs(max) ? min : max
    }
  }

  return floats
}
