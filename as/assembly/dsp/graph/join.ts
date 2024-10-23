import { logi } from '../../env'

export function join21g(
  begin: u32,
  end: u32,
  in0: usize,
  in1: usize,
  out: usize,
  gain0: f32,
  gain1: f32,
): void {
  const gain0v: v128 = f32x4.splat(gain0)
  const gain1v: v128 = f32x4.splat(gain1)

  let in0v: v128
  let in1v: v128
  let resv: v128

  let i: u32 = begin

  const offset = begin << 2
  in0 += offset
  in1 += offset
  out += offset

  for (; i < end; i += 64) {
    unroll(16, () => {
      in0v = v128.load(in0)
      in1v = v128.load(in1)
      resv = f32x4.add(
        f32x4.mul(in0v, gain0v),
        f32x4.mul(in1v, gain1v)
      )
      v128.store(out, resv)
      in0 += 16
      in1 += 16
      out += 16
    })
  }
}

// TODO: consolidate with math.add_audio_audio
export function join21(
  begin: u32,
  end: u32,
  in0: usize,
  in1: usize,
  out: usize,
): void {
  let in0v: v128
  let in1v: v128
  let resv: v128

  let i: u32 = begin

  const offset = begin << 2
  in0 += offset
  in1 += offset
  out += offset

  for (; i < end; i += 64) {
    unroll(16, () => {
      in0v = v128.load(in0)
      in1v = v128.load(in1)
      resv = f32x4.add(in0v, in1v)
      v128.store(out, resv)
      in0 += 16
      in1 += 16
      out += 16
    })
  }
}
