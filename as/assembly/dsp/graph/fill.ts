export function fill(value: f32, begin: u32, end: u32, out: usize): void {
  const v: v128 = f32x4.splat(value)

  let i: u32 = begin

  const offset = begin << 2
  out += offset

  for (; i < end; i += 64) {
    unroll(16, () => {
      v128.store(out, v)
      out += 16
    })
  }
}
