import { memoize } from 'utils'

export const getRingOffsets = memoize(function getRingOffsets(ringPos: number, length: number, max: number) {
  const a = (max - ringPos) * 128
  const b = length
  const c = 0
  const d = (ringPos + 1) * 128

  const e = 0
  const f = a
  const g = d
  const h = length

  return [a, b, c, d, e, f, g, h]
})

export function copyRingInto(target: Float32Array, source: Float32Array, ringPos: number, length: number, max: number) {
  const [a, b, c, d, e, f, g, h] = getRingOffsets(ringPos, length, max)
  target.set(
    source.subarray(c, d),
    a
  )
  target.set(
    source.subarray(g, h),
    e
  )
}
