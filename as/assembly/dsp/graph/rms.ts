export function rms(
  inp: i32,
  begin: u32,
  end: u32,
): f32 {
  let sumv: v128 = f32x4.splat(0)
  let sv: v128 = f32x4.splat(0)
  const total: f32 = f32(end - begin)

  let i: u32 = begin

  const offset = begin << 2
  inp += offset

  for (; i < end; i += 64) {
    unroll(16, () => {
      sv = v128.load(inp)

      sumv = f32x4.add(
        sumv,
        f32x4.mul(sv, sv)
      )

      inp += 16
    })
  }

  const sum: f32 =
    f32x4.extract_lane(sumv, 0) +
    f32x4.extract_lane(sumv, 1) +
    f32x4.extract_lane(sumv, 2) +
    f32x4.extract_lane(sumv, 3)

  return Mathf.sqrt(sum / total)
}

export function rmsTwo(
  inp: i32,
  begin_0: u32,
  end_0: u32,
  begin_1: u32,
  end_1: u32,
): f32 {
  let sumv: v128 = f32x4.splat(0)
  let sv: v128 = f32x4.splat(0)

  let total: f32 = f32(end_0 - begin_0) + f32(end_1 - begin_1)

  let i: u32 = begin_0
  let offset = begin_0 << 2
  let pos: i32 = inp
  pos += offset

  for (; i < end_0; i += 64) {
    unroll(16, () => {
      sv = v128.load(pos)

      sumv = f32x4.add(
        sumv,
        f32x4.mul(sv, sv)
      )

      pos += 16
    })
  }

  i = begin_1
  offset = begin_1 << 2
  pos = inp
  inp += offset

  for (; i < end_0; i += 64) {
    unroll(16, () => {
      sv = v128.load(pos)

      sumv = f32x4.add(
        sumv,
        f32x4.mul(sv, sv)
      )

      pos += 16
    })
  }

  const sum: f32 =
    f32x4.extract_lane(sumv, 0) +
    f32x4.extract_lane(sumv, 1) +
    f32x4.extract_lane(sumv, 2) +
    f32x4.extract_lane(sumv, 3)

  return Mathf.sqrt(sum / total)
}
