export type Floats = StaticArray<f32>

export function clamp255(x: f32): i32 {
  if (x > 255) x = 255
  else if (x < 0) x = 0
  return i32(x)
}

export function clamp01(x: f32): f32 {
  if (x > 1) x = 1
  else if (x < 0) x = 0
  return x
}

export function clamp11(x: f32): f32 {
  if (x > 1) x = 1
  else if (x < -1) x = -1
  return x
}

export function rgbToInt(r: f32, g: f32, b: f32): i32 {
  return (clamp255(r * 255) << 16) | (clamp255(g * 255) << 8) | clamp255(b * 255)
}

// @ts-ignore
@inline
export function rateToPhaseStep(rate: u32): u32 {
  return 0xFFFFFFFF / rate
}

// @ts-ignore
@inline
export function phaseToNormal(phase: u32): f64 {
  return phase / 0xFFFFFFFF
}

// // @ts-ignore
// export function rateToPhaseStep(rate: f64): u32 {
//   let stepFactor: f64 = 0xFFFFFFFF / (2 * Math.PI);
//   return <u32>((1.0 / rate) * stepFactor);
// }

// @ts-ignore
@inline
export function radiansToPhase(radians: f32): u32 {
  return <u32>((radians / (2 * Mathf.PI)) * 0xFFFFFFFF)
}

// @ts-ignore
@inline
export function phaseToRadians(phase: u32): f64 {
  const radiansFactor: f64 = 2 * Mathf.PI / 0xFFFFFFFF
  return <f64>phase * radiansFactor
}

// @ts-ignore
@inline
export function degreesToPhase(degrees: f32): u32 {
  return <u32>((degrees / 360.0) * 0xFFFFFFFF)
}

// @ts-ignore
@inline
export function ftoint(x: f32): i32 {
  const bits: i32 = reinterpret<i32>(x)
  const expo: i32 = (bits >> 23) & 0xFF
  const mant: i32 = bits & 0x7FFFFF
  const bias: i32 = 127
  return expo === 0
    ? mant >> (23 - (bias - 1))
    : (mant | 0x800000) >> (23 - (expo - bias))
}

// @ts-ignore
@inline
function phaseToWavetableIndex(phase: u32, wavetableSize: u32): u32 {
  const indexFactor = <f64>wavetableSize / 0xFFFFFFFF
  return <u32>(<f64>phase * indexFactor)
}

// @ts-ignore
@inline
export function phaseFrac(phase: u32): f32 {
  const u: u32 = 0x3F800000 | ((0x007FFF80 & phase) << 7)
  return reinterpret<f32>(u) - 1.0
}

// @ts-ignore
@inline
export function tofloat(u: u32): f32 {
  return (0x3F800000 | (u >> 9)) - 1.0
}

// export function copyInto<T>(src: T, dst: T): void {
//   const srcPtr = changetype<usize>(src)
//   const dstPtr = changetype<usize>(dst)
//   const size: usize = offsetof<T>()
//   for (let offset: usize = 0; offset < size; offset += sizeof<usize>()) {
//     const value = load<usize>(srcPtr + offset)
//     store<usize>(dstPtr + offset, value)
//   }
// }

const f32s: StaticArray<f32>[] = []

export function allocF32(blockSize: u32): StaticArray<f32> {
  const block = new StaticArray<f32>(blockSize)
  f32s.push(block)
  return block
}

const mems: StaticArray<i32>[] = []

export function cloneI32(src: usize, size: usize): StaticArray<i32> {
  const mem = new StaticArray<i32>(i32(size))
  memory.copy(changetype<usize>(mem), src, size)
  mems.push(mem)
  return mem
}

export function getObjectSize<T>(): usize {
  return offsetof<T>()
}

export function nextPowerOfTwo(v: u32): u32 {
  v--
  v |= v >> 1
  v |= v >> 2
  v |= v >> 4
  v |= v >> 8
  v |= v >> 16
  v++
  return v
}

export function clamp64(min: f64, max: f64, def: f64, value: f64): f64 {
  if (value - value !== 0) return def
  if (value < min) value = min
  if (value > max) value = max
  return value
}
export function clamp(min: f32, max: f32, def: f32, value: f32): f32 {
  if (value - value !== 0) return def
  if (value < min) value = min
  if (value > max) value = max
  return value
}

export function clampMax(max: f32, s: f32): f32 {
  return s > max ? max : s
}

export function paramClamp(param: f32[], value: f32): f32 {
  return clamp(param[0], param[1], param[2], value)
}

export function cubic(floats: StaticArray<f32>, index: f32, mask: u32): f32 {
  index += <f32>mask
  const i: i32 = u32(index)
  const fr: f32 = index - f32(i)

  const p: i32 = i32(changetype<usize>(floats)) //+ (i << 2)
  const xm: f32 = f32.load(p + (((i - 1) & mask) << 2))
  const x0: f32 = f32.load(p + (((i) & mask) << 2)) //floats[(i) & mask]
  const x1: f32 = f32.load(p + (((i + 1) & mask) << 2)) //floats[(i + 1) & mask]
  const x2: f32 = f32.load(p + (((i + 2) & mask) << 2)) //floats[(i + 2) & mask]

  // const a: f32 = (3.0 * (x0 - x1) - xm + x2) * .5
  // const b: f32 = 2.0 * x1 + xm - (5.0 * x0 + x2) * .5
  // const c: f32 = (x1 - xm) * .5

  // this has one operation less (a +), are they equal though?
  // const c0: f32 = x0
  // const c1: f32 = 0.5 * (x1 - xm)
  // const c2: f32 = xm - 2.5 * x0 + 2.0 * x1 - 0.5 * x2
  // const c3: f32 = 0.5 * (x2 - xm) + 1.5 * (x0 - x1)
  // return ((c3 * fr + c2) * fr + c1) * fr + c0

  const a: f32 = (3.0 * (x0 - x1) - xm + x2) * .5
  const b: f32 = 2.0 * x1 + xm - (5.0 * x0 + x2) * .5
  const c: f32 = (x1 - xm) * .5

  return (((a * fr) + b)
    * fr + c)
    * fr + x0
}

export function cubicFrac(floats: StaticArray<f32>, index: u32, fr: f32, mask: u32): f32 {
  const i: i32 = u32(index)

  const xm: f32 = floats[(i - 1) & mask]
  const x0: f32 = floats[(i) & mask]
  const x1: f32 = floats[(i + 1) & mask]
  const x2: f32 = floats[(i + 2) & mask]

  const a: f32 = (3.0 * (x0 - x1) - xm + x2) * .5
  const b: f32 = 2.0 * x1 + xm - (5.0 * x0 + x2) * .5
  const c: f32 = (x1 - xm) * .5

  return (((a * fr) + b)
    * fr + c)
    * fr + x0
}

export function cubicMod(floats: StaticArray<f32>, index: f64, length: u32): f32 {
  const i: i32 = i32(index) + i32(length)
  index += f64(length)
  const fr: f64 = index - f64(i)

  // TODO: we could possibly improve this perf by moding the index early
  // and branching, but lets keep it simple for now.
  const xm = f64(unchecked(floats[(i - 1) % length]))
  const x0 = f64(unchecked(floats[(i) % length]))
  const x1 = f64(unchecked(floats[(i + 1) % length]))
  const x2 = f64(unchecked(floats[(i + 2) % length]))

  const a: f64 = (3.0 * (x0 - x1) - xm + x2) * .5
  const b: f64 = 2.0 * x1 + xm - (5.0 * x0 + x2) * .5
  const c: f64 = (x1 - xm) * .5

  return f32((((a * fr) + b)
    * fr + c)
    * fr + x0)
}

// export function cubicMod(floats: StaticArray<f32>, index: f32, frames: u32): f32 {
//   const i: i32 = u32(index) + frames
//   index += <f32>frames
//   const fr: f32 = index - f32(i)
//   const xm: f32 = floats[(i - 1) % frames]
//   const x0: f32 = floats[(i) % frames]
//   const x1: f32 = floats[(i + 1) % frames]
//   const x2: f32 = floats[(i + 2) % frames]

//   const a: f32 = (3.0 * (x0 - x1) - xm + x2) * .5
//   const b: f32 = 2.0 * x1 + xm - (5.0 * x0 + x2) * .5
//   const c: f32 = (x1 - xm) * .5

//   return (((a * fr) + b)
//     * fr + c)
//     * fr + x0
// }

let seed: u32 = 0
export function rnd(amt: f64 = 1): f64 {
  seed += 0x6D2B79F5
  let t: u32 = seed
  t = (t ^ t >>> 15) * (t | 1)
  t ^= t + (t ^ t >>> 7) * (t | 61)
  return (f64((t ^ t >>> 14) >>> 0) / 4294967296.0) * amt
}

export function modWrap(x: f64, N: f64): f64 {
  return (x % N + N) % N
}
