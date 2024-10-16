import { Gen } from './gen'

export class Tanha extends Gen {
  gain: f32 = 1
  _gainv: v128 = f32x4.splat(1.0);

  in: u32 = 0

  _update(): void {
    this._gainv = f32x4.splat(this.gain)
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const gainv: v128 = this._gainv

    let in0: u32 = this.in

    let x: v128
    let resv: v128

    let i: u32 = begin

    const offset = begin << 2
    in0 += offset
    out += offset

    let x2: v128

    for (; i < end; i += 64) {
      unroll(16, () => {
        x = v128.load(in0)

        x = f32x4.mul(x, gainv)

        // Calculate x * x
        x2 = f32x4.mul(x, x)

        // Calculate 5.0 + x * x
        resv = f32x4.add(f32x4.splat(5.0), x2)

        // Calculate x * x / (5.0 + x * x)
        resv = f32x4.div(x2, resv)

        // Calculate 3.0 + x * x / (5.0 + x * x)
        resv = f32x4.add(f32x4.splat(3.0), resv)

        // Calculate x / (1.0 + x * x / (3.0 + x * x / 5.0))
        resv = f32x4.div(x, f32x4.add(f32x4.splat(1.0), f32x4.div(x2, resv)))

        // Calculate min(x / (1.0 + x * x / (3.0 + x * x / 5.0)), 1.0)
        resv = f32x4.min(resv, f32x4.splat(1.0))

        // Calculate max(-1.0, min(x / (1.0 + x * x / (3.0 + x * x / 5.0)), 1.0))
        resv = f32x4.max(resv, f32x4.splat(-1.0))

        v128.store(out, resv)

        in0 += 16
        out += 16
      })
    }
  }
}
