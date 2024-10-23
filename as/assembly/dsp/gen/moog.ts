import { paramClamp } from '../../util'
import { Gen } from './gen'

// TODO: f64

function tanha(x: f32): f32 {
  return x / (1.0 + x * x / (3.0 + x * x / 5.0))
}

// https://github.com/mixxxdj/mixxx/blob/main/src/engine/filters/enginefiltermoogladder4.h
export class Moog extends Gen {
  in: u32 = 0

  _m_azt1: f32 = 0
  _m_azt2: f32 = 0
  _m_azt3: f32 = 0
  _m_azt4: f32 = 0
  _m_az5: f32 = 0
  _m_amf: f32 = 0

  _v2: f32 = 0
  _x1: f32 = 0
  _az3: f32 = 0
  _az4: f32 = 0
  _amf: f32 = 0

  _kVt: f32 = 1.2

  _m_kacr: f32 = 0
  _m_k2vg: f32 = 0
  _m_postGain: f32 = 0

  _params_freq: f32[] = [50, 22040, 4000]
  _params_Q: f32[] = [0.01, 0.985, 0.5]

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

    this._v2 = 2.0 + this._kVt
    const kfc: f32 = freq / f32(this._engine.sampleRate)
    const kf: f32 = kfc

    const kfcr: f32 = 1.8730 * (kfc * kfc * kfc) + 0.4955 * (kfc * kfc) -
      0.6490 * kfc + 0.9988

    const x: f32 = -2.0 * Mathf.PI * kfcr * kf
    const exp_out: f32 = Mathf.exp(x)
    const m_k2vgNew: f32 = this._v2 * (1.0 - exp_out)
    const m_kacrNew: f32 = Q * (-3.9364 * (kfc * kfc) + 1.8409 * kfc + 0.9968)
    const m_postGainNew: f32 = 1.0001784074555027 + (0.9331585678097162 * Q)

    this._m_postGain = m_postGainNew
    this._m_kacr = m_kacrNew
    this._m_k2vg = m_k2vgNew
  }

  @inline _process(x0: f32): void {
    this._x1 = x0 - this._m_amf * this._m_kacr;
    const az1: f32 = this._m_azt1 + this._m_k2vg * tanha(this._x1 / this._v2);
    const at1: f32 = this._m_k2vg * tanha(az1 / this._v2);
    this._m_azt1 = az1 - at1

    const az2 = this._m_azt2 + at1
    const at2 = this._m_k2vg * tanha(az2 / this._v2)
    this._m_azt2 = az2 - at2

    this._az3 = this._m_azt3 + at2;
    const at3 = this._m_k2vg * tanha(this._az3 / this._v2);
    this._m_azt3 = this._az3 - at3

    this._az4 = this._m_azt4 + at3;
    const at4 = this._m_k2vg * tanha(this._az4 / this._v2);
    this._m_azt4 = this._az4 - at4;

    // this is for oversampling but we're not doing it here yet, see link
    this._m_amf = this._az4;
  }

  @inline _lowpass(): f32 {
    return this._m_amf * this._m_postGain
  }

  @inline _highpass(): f32 {
    return (this._x1 - 3.0 * this._az3 + 2 * this._az4) * this._m_postGain
  }
}
