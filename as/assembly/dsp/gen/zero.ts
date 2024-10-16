import { Gen } from './gen'

export class Zero extends Gen {
  _audio(begin: u32, end: u32, out: usize): void {
    const zerov: v128 = f32x4.splat(0)

    let i: u32 = begin

    const offset = begin << 2
    out += offset

    for (; i < end; i += 64) {
      unroll(16, () => {
        v128.store(out, zerov)
        out += 16
      })
    }
  }
}
