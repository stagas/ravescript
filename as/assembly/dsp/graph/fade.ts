export function fadeIn(
  total: u32,
  begin: u32,
  end: u32,
  block: usize,
): void {
  let gainv: v128 = f32x4.splat(0)
  let frame: u32 = 0
  let resv: v128

  let i: u32 = begin

  const offset = begin << 2
  block += offset

  for (; i < end; i += 64) {
    unroll(16, () => {
      gainv = f32x4.splat(Mathf.min(1.0, f32(frame) / f32(total)))
      resv = v128.load(block)
      resv = f32x4.mul(resv, gainv)
      v128.store(block, resv)
      block += 16
      frame += 4
    })
  }
}

export function fadeIn16(
  total: u32,
  begin: u32,
  end: u32,
  block: usize,
): void {
  let gainv: v128 = f32x4.splat(0)
  let frame: u32 = 0
  let resv: v128

  let i: u32 = begin

  const offset = begin << 2
  block += offset

  for (; i < end; i += 16) {
    unroll(4, () => {
      gainv = f32x4.splat(Mathf.min(1.0, f32(frame) / f32(total)))
      resv = v128.load(block)
      resv = f32x4.mul(resv, gainv)
      v128.store(block, resv)
      block += 16
      frame += 4
    })
  }
}

export function fadeOut(
  total: u32,
  begin: u32,
  end: u32,
  block: usize,
): void {
  let gainv: v128 = f32x4.splat(0)
  let frame: u32 = 0
  let resv: v128

  let i: u32 = begin

  const offset = begin << 2
  block += offset

  for (; i < end; i += 64) {
    unroll(16, () => {
      gainv = f32x4.splat(Mathf.max(0, 1.0 - (f32(frame) / f32(total))))
      resv = v128.load(block)
      resv = f32x4.mul(resv, gainv)
      v128.store(block, resv)
      block += 16
      frame += 4
    })
  }
}

export function fadeOut16(
  total: u32,
  begin: u32,
  end: u32,
  block: usize,
): void {
  let gainv: v128 = f32x4.splat(0)
  let frame: u32 = 0
  let resv: v128

  let i: u32 = begin

  const offset = begin << 2
  block += offset

  for (; i < end; i += 16) {
    unroll(4, () => {
      gainv = f32x4.splat(Mathf.max(0, 1.0 - (f32(frame) / f32(total))))
      resv = v128.load(block)
      resv = f32x4.mul(resv, gainv)
      v128.store(block, resv)
      block += 16
      frame += 4
    })
  }
}
