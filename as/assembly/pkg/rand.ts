let seed: u32 = 0
export function rand(amt: f64 = 1): f64 {
  seed += 0x6D2B79F5
  let t: u32 = seed
  t = (t ^ t >>> 15) * (t | 1)
  t ^= t + (t ^ t >>> 7) * (t | 61)
  return (f64((t ^ t >>> 14) >>> 0) / 4294967296.0) * amt
}
