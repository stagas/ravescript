import { Gen } from './gen'

function soft(x: f32, amount: f32 = 1): f32 {
  return x / (1 / amount + Mathf.abs(x))
}

function clamp(min: f32, max: f32, value: f32): f32 {
  if (value < min) value = min
  if (value > max) value = max
  return value
}

// @ts-ignore
@inline const PI2 = Mathf.PI * 2.0

export class Diode extends Gen {
  cut: f32 = 500;
  hpf: f32 = 1000;
  sat: f32 = 1.0;
  q: f32 = 0.0;

  in: u32 = 0

  _z0: f32 = 0
  _z1: f32 = 0
  _z2: f32 = 0
  _z3: f32 = 0
  _z4: f32 = 0

  _A: f32 = 0
  _a: f32 = 0
  _a2: f32 = 0
  _b: f32 = 0
  _b2: f32 = 0
  _c: f32 = 0
  _g: f32 = 0
  _g0: f32 = 0
  _ah: f32 = 0
  _bh: f32 = 0
  _ainv: f32 = 0
  _k: f32 = 0

  _update(): void {
    // fc: normalized cutoff frequency in the range [0..1] => 0 HZ .. Nyquist
    const nyq: f32 = f32(this._engine.sampleRate) / 2.0

    // logf(this.hpf / nyq)
    // logf(this.cut / nyq)
    // hpf
    const K: f32 = clamp(0, 1, (this.hpf / nyq)) * Mathf.PI
    this._ah = (K - 2.0) / (K + 2.0)
    const bh: f32 = 2.0 / (K + 2.0)
    this._bh = bh

    // q: resonance in the range [0..1]
    this._k = 20.0 * this.q
    this._A = 1.0 + 0.5 * this._k // resonance gain compensation

    let a: f32 = Mathf.PI * clamp(0, 1, (this.cut / nyq)) // PI is Nyquist frequency
    a = 2.0 * Mathf.tan(0.5 * a) // dewarping, not required with 2x oversampling
    this._ainv = 1.0 / a
    const a2: f32 = a * a
    const b: f32 = 2.0 * a + 1.0
    const b2: f32 = b * b
    const c: f32 = 1.0 / (2.0 * a2 * a2 - 4 * a2 * b2 + b2 * b2)
    const g0: f32 = 2.0 * a2 * a2 * c
    this._g = g0 * bh

    this._a = a
    this._a2 = a2
    this._b = b
    this._b2 = b2
    this._c = c
    this._g0 = g0
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const A = this._A
    const a = this._a
    const a2 = this._a2
    const b = this._b
    const b2 = this._b2
    const c = this._c
    const g = this._g
    const g0 = this._g0
    const ah = this._ah
    const bh = this._bh
    const ainv = this._ainv
    const k = this._k
    const sat = this.sat

    const length: u32 = end - begin

    let sample: f32 = 0
    let inp: u32 = this.in

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    inp += offset
    out += offset

    let z0 = this._z0
    let z1 = this._z1
    let z2 = this._z2
    let z3 = this._z3
    let z4 = this._z4

    let s0: f32
    let s: f32
    let y0: f32
    let y1: f32
    let y2: f32
    let y3: f32
    let y4: f32
    let y5: f32

    for (; i < end; i += 1) {
      // unroll(16, () => {
      sample = f32.load(inp)

      // current state
      s0 = (a2 * a * z0 + a2 * b * z1 + z2 * (b2 - 2.0 * a2) * a + z3 * (b2 - 3.0 * a2) * b) * c
      s = bh * s0 - z4

      // solve feedback loop (linear)
      y5 = (g * sample + s) / (1.0 + g * k)

      // input clipping
      y0 = soft(sample - k * y5, sat)
      y5 = g * y0 + s

      // compute integrator outputs
      y4 = g0 * y0 + s0
      y3 = (b * y4 - z3) * ainv
      y2 = (b * y3 - a * y4 - z2) * ainv
      y1 = (b * y2 - a * y3 - z1) * ainv

      // update filter state
      z0 += 4.0 * a * (y0 - y1 + y2)
      z1 += 2.0 * a * (y1 - 2.0 * y2 + y3)
      z2 += 2.0 * a * (y2 - 2.0 * y3 + y4)
      z3 += 2.0 * a * (y3 - 2.0 * y4)
      z4 = bh * y4 + ah * y5

      sample = A * y4

      f32.store(out, sample)
      inp += 4
      out += 4
      // })
    }

    // update filter state
    this._z0 = z0
    this._z1 = z1
    this._z2 = z2
    this._z3 = z3
    this._z4 = z4
  }
}
