import { paramClamp } from '../../util'
import { Gen } from './gen'

export class Svf extends Gen {
  in: u32 = 0

  _c1: f64 = 0
  _c2: f64 = 0

  _a1: f64 = 1
  _a2: f64 = 0
  _a3: f64 = 0

  _v0: f64 = 0
  _v1: f64 = 0
  _v2: f64 = 0
  _v3: f64 = 0

  _k: f64 = 0

  _params_freq: f32[] = [50, 22040, 4000]
  _params_Q: f32[] = [0.01, 0.985, 1.0]

  _reset(): void {
    this._clear()
  }

  @inline _clear(): void {
    this._a1 = 0
    this._a2 = 0
    this._a3 = 0

    this._v1 = 0
    this._v2 = 0
    this._v3 = 0
  }

  @inline _validate(freq: f32, Q: f32): boolean {
    if (freq <= 0) return false
    if (freq !== freq) return false
    if (Q <= 0) return false
    if (Q !== Q) return false
    return true
  }

  @inline _updateCoeffs(freq: f32, Q: f32): void {
    if (!this._validate(freq, Q)) return
    freq = paramClamp(this._params_freq, freq)
    Q = paramClamp(this._params_Q, Q)
    const g: f64 = Math.tan(Math.PI * freq / f64(this._engine.sampleRate))
    this._k = 2.0 - 2.0 * Q
    this._a1 = 1.0 / (1.0 + g * (g + this._k))
    this._a2 = g * this._a1
    this._a3 = g * this._a2
  }

  @inline _process(v0: f32): void {
    this._v0 = f64(v0)
    this._v3 = v0 - this._c2
    this._v1 = this._a1 * this._c1 + this._a2 * this._v3
    this._v2 = this._c2 + this._a2 * this._c1 + this._a3 * this._v3
    this._c1 = 2.0 * this._v1 - this._c1
    this._c2 = 2.0 * this._v2 - this._c2
  }

  @inline _lowpass(): f32 {
    return f32(this._v2)
  }

  @inline _bandpass(): f32 {
    return f32(this._v1)
  }

  @inline _highpass(): f32 {
    return f32(this._v0 - this._k * this._v1 - this._v2)
  }

  @inline _notch(): f32 {
    return f32(this._v0 - this._k * this._v1)
  }

  @inline _peak(): f32 {
    return f32(this._v0 - this._k * this._v1 - 2.0 * this._v2)
  }

  @inline _allpass(): f32 {
    return f32(this._v0 - 2.0 * this._k * this._v1)
  }
}
