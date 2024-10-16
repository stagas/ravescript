import { paramClamp } from '../../util'
import { Gen } from './gen'

// @ts-ignore
@inline const PI2 = Math.PI * 2.0

export class Biquad extends Gen {
  in: u32 = 0

  _x1: f64 = 0
  _x2: f64 = 0
  _y1: f64 = 0
  _y2: f64 = 0

  _a0: f64 = 1
  _a1: f64 = 0
  _a2: f64 = 0
  _b0: f64 = 0
  _b1: f64 = 0
  _b2: f64 = 0

  _params_freq: f32[] = [50, 22040, 4000]
  _params_Q: f32[] = [0.01, 40, 1.0]
  _params_gain: f32[] = [-10, 10, 0]

  @inline _clear(): void {
    this._x1 = 0
    this._x2 = 0
    this._y1 = 0
    this._y2 = 0

    this._a0 = 1
    this._a1 = 0
    this._a2 = 0
    this._b0 = 0
    this._b1 = 0
    this._b2 = 0
  }

  @inline _db(gain: f64): f64 {
    return Math.pow(10.0, gain / 20.0)
  }

  @inline _omega(freq: f64): f64 {
    return (PI2 * freq) / f64(this._engine.sampleRate)
  }

  @inline _alpha(sin0: f64, Q: f64): f64 {
    return sin0 / (2.0 * Q)
  }

  @inline _shelf(sin0: f64, A: f64, Q: f64): f64 {
    return (
      2.0 *
      Math.sqrt(A) *
      ((sin0 / 2) * Math.sqrt((A + 1 / A) * (1 / Q - 1) + 2))
    )
  }

  @inline _validate(freq: f32, Q: f32): boolean {
    if (freq <= 0) return false
    if (freq !== freq) return false
    if (Q <= 0) return false
    if (Q !== Q) return false
    return true
  }

  @inline _lowpass(freq: f32, Q: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)
    const alpha: f64 = this._alpha(sin0, f64(Q))

    this._b0 = (1.0 - cos0) / 2.0
    this._b1 = 1.0 - cos0
    this._b2 = (1.0 - cos0) / 2.0
    this._a0 = 1.0 + alpha
    this._a1 = -2.0 * cos0
    this._a2 = 1.0 - alpha
    this._integrate()
  }

  @inline _highpass(freq: f32, Q: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)
    const alpha: f64 = this._alpha(sin0, f64(Q))

    this._b0 = (1.0 + cos0) / 2.0
    this._b1 = -(1.0 + cos0)
    this._b2 = (1.0 + cos0) / 2.0
    this._a0 = 1.0 + alpha
    this._a1 = -2.0 * cos0
    this._a2 = 1.0 - alpha
    this._integrate()
  }

  @inline _bandpass(freq: f32, Q: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)
    const alpha: f64 = this._alpha(sin0, f64(Q))

    this._b0 = alpha
    this._b1 = 0.0
    this._b2 = -alpha
    this._a0 = 1.0 + alpha
    this._a1 = -2.0 * cos0
    this._a2 = 1.0 - alpha
    this._integrate()
  }

  @inline _notch(freq: f32, Q: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)
    const alpha: f64 = this._alpha(sin0, f64(Q))

    this._b0 = 1.0
    this._b1 = -2.0 * cos0
    this._b2 = 1.0
    this._a0 = 1.0 + alpha
    this._a1 = -2.0 * cos0
    this._a2 = 1.0 - alpha
    this._integrate()
  }

  @inline _allpass(freq: f32, Q: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)
    const alpha: f64 = this._alpha(sin0, f64(Q))

    this._b0 = 1.0 - alpha
    this._b1 = -2.0 * cos0
    this._b2 = 1.0 + alpha
    this._a0 = 1.0 + alpha
    this._a1 = -2.0 * cos0
    this._a2 = 1.0 - alpha
    this._integrate()
  }

  @inline _peak(freq: f32, Q: f32, gain: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    gain = paramClamp(this._params_gain, gain)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)
    const alpha: f64 = this._alpha(sin0, f64(Q))

    const A: f64 = this._db(f64(gain))

    this._b0 = 1.0 + alpha * A
    this._b1 = -2.0 * cos0
    this._b2 = 1.0 - alpha * A
    this._a0 = 1.0 + alpha / A
    this._a1 = -2.0 * cos0
    this._a2 = 1.0 - alpha / A
    this._integrate()
  }

  @inline _lowshelf(freq: f32, Q: f32, gain: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    gain = paramClamp(this._params_gain, gain)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)

    const A: f64 = this._db(f64(gain))
    const S: f64 = this._shelf(sin0, A, f64(Q))

    this._b0 = A * (A + 1.0 - (A - 1.0) * cos0 + S)
    this._b1 = 2.0 * A * (A - 1.0 - (A + 1.0) * cos0)
    this._b2 = A * (A + 1.0 - (A - 1.0) * cos0 - S)
    this._a0 = A + 1.0 + (A - 1.0) * cos0 + S
    this._a1 = -2.0 * (A - 1.0 + (A + 1.0) * cos0)
    this._a2 = A + 1.0 + (A - 1.0) * cos0 - S
    this._integrate()
  }

  @inline _highshelf(freq: f32, Q: f32, gain: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    gain = paramClamp(this._params_gain, gain)
    const omega: f64 = this._omega(f64(freq))
    const sin0: f64 = Math.sin(omega)
    const cos0: f64 = Math.cos(omega)

    const A: f64 = this._db(f64(gain))
    const S: f64 = this._shelf(sin0, A, f64(Q))

    this._b0 = A * (A + 1.0 + (A - 1.0) * cos0 + S)
    this._b1 = -2.0 * A * (A - 1.0 + (A + 1.0) * cos0)
    this._b2 = A * (A + 1.0 + (A - 1.0) * cos0 - S)
    this._a0 = A + 1.0 - (A - 1.0) * cos0 + S
    this._a1 = 2.0 * (A - 1.0 - (A + 1.0) * cos0)
    this._a2 = A + 1.0 - (A - 1.0) * cos0 - S
    this._integrate()
  }

  @inline _integrate(): void {
    const g: f64 = 1.0 / this._a0

    this._b0 *= g
    this._b1 *= g
    this._b2 *= g
    this._a1 *= g
    this._a2 *= g
  }

  @inline _process(x0: f32): f32 {
    const y0: f64 =
      this._b0 * f64(x0) +
      this._b1 * this._x1 +
      this._b2 * this._x2 -
      this._a1 * this._y1 -
      this._a2 * this._y2

    this._x2 = this._x1
    this._y2 = this._y1
    this._x1 = f64(x0)
    this._y1 = y0

    return f32(y0)
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin

    let sample: f32 = 0
    let inp: u32 = this.in

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    inp += offset
    out += offset

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = f32.load(inp)
        sample = this._process(sample)
        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
