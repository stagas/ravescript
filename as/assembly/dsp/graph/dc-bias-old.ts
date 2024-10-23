import { logf } from '../../env'

export function dcBias(
  begin: u32,
  end: u32,
  block: usize,
): void {
  const ptr: usize = block
  const length: u32 = end - begin
  let i: u32 = begin
  let resv: v128 = f32x4.splat(0)

  end = i + (length >> 2) // divide length by 4 because we process 4 elements at a time

  for (; i < end; i += 32) {
    unroll(32, () => {
      resv = f32x4.add(resv, v128.load(block))
      block += 16
    })
  }

  const sum: f32 =
    f32x4.extract_lane(resv, 0)
    + f32x4.extract_lane(resv, 1)
    + f32x4.extract_lane(resv, 2)
    + f32x4.extract_lane(resv, 3)

  const mean: f32 = sum / f32(length)
  logf(mean)
  const meanv: v128 = f32x4.splat(mean)

  block = ptr
  i = begin
  for (; i < end; i += 32) {
    unroll(32, () => {
      resv = v128.load(block)
      resv = f32x4.sub(resv, meanv)
      v128.store(block, resv)
      block += 16
    })
  }
}
