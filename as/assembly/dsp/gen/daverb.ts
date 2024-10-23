import { cubic } from '../../util'
import { DELAY_MAX_SIZE } from '../core/constants'
import { Gen } from './gen'

// nearestPowerOfTwo.ts

// Function to find the nearest power of two
export function nearestPowerOfTwo(n: u32): u32 {
  // If n is already a power of two, return it
  if ((n & (n - 1)) === 0) {
    return n
  }

  let power: u32 = 0
  let result: u32 = 1

  while (result < n) {
    result <<= 1 // Multiply result by 2 (left shift)
    power++
  }

  // Check the nearest powers of two on both sides
  const lowerPower = result - n
  const upperPower = (result << 1) - n

  // Return the nearest power of two
  if (lowerPower < upperPower) {
    return result
  } else {
    return result << 1 // Multiply result by 2 (left shift)
  }
}

const ld0: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.004771345))
const ld1: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.003595309))
const ld2: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.012734787))
const ld3: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.009307483))
const ld4: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.022579886))
const ld5: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.149625349))
const ld6: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.060481839))
const ld7: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.1249958))
const ld8: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.030509727))
const ld9: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.141695508))
const ld10: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.089244313))
const ld11: u32 = nearestPowerOfTwo(<u32>(48000.0 * 0.106280031))

const md0: u32 = ld0 - 1
const md1: u32 = ld1 - 1
const md2: u32 = ld2 - 1
const md3: u32 = ld3 - 1
const md4: u32 = ld4 - 1
const md5: u32 = ld5 - 1
const md6: u32 = ld6 - 1
const md7: u32 = ld7 - 1
const md8: u32 = ld8 - 1
const md9: u32 = ld9 - 1
const md10: u32 = ld10 - 1
const md11: u32 = ld11 - 1

const lo0: u32 = u32(0.008937872 * 48000)
const lo1: u32 = u32(0.099929438 * 48000)
const lo2: u32 = u32(0.064278754 * 48000)
const lo3: u32 = u32(0.067067639 * 48000)
const lo4: u32 = u32(0.066866033 * 48000)
const lo5: u32 = u32(0.006283391 * 48000)
const lo6: u32 = u32(0.035818689 * 48000)

const ro0: u32 = u32(0.011861161 * 48000)
const ro1: u32 = u32(0.121870905 * 48000)
const ro2: u32 = u32(0.041262054 * 48000)
const ro3: u32 = u32(0.08981553 * 48000)
const ro4: u32 = u32(0.070931756 * 48000)
const ro5: u32 = u32(0.011256342 * 48000)
const ro6: u32 = u32(0.004065724 * 48000)

export class Daverb extends Gen {
  in: u32 = 0

  pd: f32 = 0.03
  bw: f32 = 0.1
  fi: f32 = 0.5
  si: f32 = 0.5
  dc: f32 = 0.5
  ft: f32 = 0.5
  st: f32 = 0.5
  dp: f32 = 0.5
  ex: f32 = 0.5
  ed: f32 = 0.5

  _params_pd: f32[] = [0, 1, 0.03]
  _params_bw: f32[] = [0, 1, 0.1]
  _params_fi: f32[] = [0, 1, 0.5]
  _params_si: f32[] = [0, 1, 0.5]
  _params_dc: f32[] = [0, 1, 0.5]
  _params_ft: f32[] = [0, 0.999999, 0.5]
  _params_st: f32[] = [0, 0.999999, 0.5]
  _params_dp: f32[] = [0, 1, 0.5]
  _params_ex: f32[] = [0, 2, 0.5]
  _params_ed: f32[] = [0, 2, 0.5]

  _dpn: f32 = 0
  _exn: f32 = 0
  _edn: f32 = 0
  _pdn: f32 = 0

  _predelay: StaticArray<f32> = new StaticArray<f32>(DELAY_MAX_SIZE)
  _d0: StaticArray<f32> = new StaticArray<f32>(ld0)
  _d1: StaticArray<f32> = new StaticArray<f32>(ld1)
  _d2: StaticArray<f32> = new StaticArray<f32>(ld2)
  _d3: StaticArray<f32> = new StaticArray<f32>(ld3)
  _d4: StaticArray<f32> = new StaticArray<f32>(ld4)
  _d5: StaticArray<f32> = new StaticArray<f32>(ld5)
  _d6: StaticArray<f32> = new StaticArray<f32>(ld6)
  _d7: StaticArray<f32> = new StaticArray<f32>(ld7)
  _d8: StaticArray<f32> = new StaticArray<f32>(ld8)
  _d9: StaticArray<f32> = new StaticArray<f32>(ld9)
  _d10: StaticArray<f32> = new StaticArray<f32>(ld10)
  _d11: StaticArray<f32> = new StaticArray<f32>(ld11)

  _index: u32 = 0
  _mask: u32 = DELAY_MAX_SIZE - 1

  _lp1: f32 = 0
  _lp2: f32 = 0
  _lp3: f32 = 0
  _exc_phase: f32 = 0

  _update(): void {
    const arf: f32 = f32(this._engine.sampleRate)
    this._dpn = 1.0 - this.dp
    this._exn = this.ex / arf
    this._edn = this.ed * arf / 1000.0
    this._pdn = this.pd * arf
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

    const mask: u32 = this._mask
    let p: i32 = this._index
    let pm: i32 = p - 1

    let lp1: f32 = this._lp1
    let lp2: f32 = this._lp2
    let lp3: f32 = this._lp3

    let split: f32 = 0

    let exc_phase: f32 = this._exc_phase
    let exn: f32 = this._exn
    let edn: f32 = this._edn
    let exc: f32 = 0
    let exc2: f32 = 0

    let lo: f32 = 0
    let ro: f32 = 0

    let d4p: f32 = 0
    let d8p: f32 = 0

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = f32.load(inp)

        // predelay
        this._predelay[p & mask] = sample * 0.5

        lp1 += this.bw * (cubic(this._predelay, <f32>p - this._pdn, mask) - lp1)

        // pre-tank
        this._d0[p & md0] = lp1 - this.fi * this._d0[pm & md0]
        this._d1[p & md1] = this.fi * (this._d0[p & md0] - this._d1[pm & md1]) + this._d0[pm & md0]
        this._d2[p & md2] = this.fi * this._d1[p & md1] + this._d1[pm & md1] - this.si * this._d2[pm & md2]
        this._d3[p & md3] = this.si * (this._d2[p & md2] - this._d3[pm & md3]) + this._d2[pm & md2]

        split = this.si * this._d3[p & md3] + this._d3[pm & md3]

        // excursions
        exc = edn * (1 + Mathf.cos(exc_phase * 6.2800))
        exc2 = edn * (1 + Mathf.sin(exc_phase * 6.2847))

        // left loop
        d4p = cubic(this._d4, <f32>p - exc, md4)
        this._d4[p & md4] = split + this.dc * this._d11[pm & md11] + this.ft * d4p // tank diffuse 1
        this._d5[p & md5] = d4p - this.ft * this._d4[p & md4] // long delay 1

        lp2 += this._dpn * (this._d5[pm & md5] - lp2) // damp 1

        this._d6[p & md6] = this.dc * lp2 - this.st * this._d6[pm & md6] // tank diffuse 2
        this._d7[p & md7] = this._d6[pm & md6] + this.st * this._d6[p & md6] // long delay 2

        // right loop
        d8p = cubic(this._d8, <f32>p - exc2, md8)
        this._d8[p & md8] = split + this.dc * this._d7[pm & md7] + this.ft * d8p // tank diffuse 3
        this._d9[p & md9] = d8p - this.ft * this._d8[p & md8] // long delay 3

        lp3 += this._dpn * this._d9[pm & md9] - lp3 // damp 2

        this._d10[p & md10] = this.dc * lp3 - this.st * this._d10[pm & md10]
        this._d11[p & md11] = this._d10[pm & md10] + this.st * this._d10[p & md10]

        exc_phase += exn

        lo = this._d9[(p - lo0) & md9]
          + this._d9[(p - lo1) & md9]
          - this._d10[(p - lo2) & md10]
          + this._d11[(p - lo3) & md11]
          - this._d5[(p - lo4) & md5]
          - this._d6[(p - lo5) & md6]
          - this._d7[(p - lo6) & md7]


        ro = this._d5[(p - ro0) & md5]
          + this._d5[(p - ro1) & md5]
          - this._d6[(p - ro2) & md6]
          + this._d7[(p - ro3) & md7]
          - this._d9[(p - ro4) & md9]
          - this._d10[(p - ro5) & md10]
          - this._d11[(p - ro6) & md11]


        sample = (lo + ro) * 0.5

        f32.store(out, sample)

        inp += 4
        out += 4
        p++
        pm++
      })
    }

    this._index = p & mask
    this._exc_phase = exc_phase % Mathf.PI
    this._lp1 = lp1
    this._lp2 = lp2
    this._lp3 = lp3
  }

  _audio_stereo(begin: u32, end: u32, out_0: usize, out_1: usize): void {
    const length: u32 = end - begin

    let sample: f32 = 0
    let inp: u32 = this.in

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    inp += offset
    out_0 += offset
    out_1 += offset

    const mask: u32 = this._mask
    let p: i32 = this._index
    let pm: i32 = p - 1

    let lp1: f32 = this._lp1
    let lp2: f32 = this._lp2
    let lp3: f32 = this._lp3

    let split: f32 = 0

    let exc_phase: f32 = this._exc_phase
    let exn: f32 = this._exn
    let edn: f32 = this._edn
    let exc: f32 = 0
    let exc2: f32 = 0

    let lo: f32 = 0
    let ro: f32 = 0

    let d4p: f32 = 0
    let d8p: f32 = 0

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = f32.load(inp)

        // predelay
        this._predelay[p & mask] = sample * 0.5

        lp1 += this.bw * (cubic(this._predelay, <f32>p - this._pdn, mask) - lp1)

        // pre-tank
        this._d0[p & md0] = lp1 - this.fi * this._d0[pm & md0]
        this._d1[p & md1] = this.fi * (this._d0[p & md0] - this._d1[pm & md1]) + this._d0[pm & md0]
        this._d2[p & md2] = this.fi * this._d1[p & md1] + this._d1[pm & md1] - this.si * this._d2[pm & md2]
        this._d3[p & md3] = this.si * (this._d2[p & md2] - this._d3[pm & md3]) + this._d2[pm & md2]

        split = this.si * this._d3[p & md3] + this._d3[pm & md3]

        // excursions
        exc = edn * (1 + Mathf.cos(exc_phase * 6.2800))
        exc2 = edn * (1 + Mathf.sin(exc_phase * 6.2847))

        // left loop
        d4p = cubic(this._d4, <f32>p - exc, md4)
        this._d4[p & md4] = split + this.dc * this._d11[pm & md11] + this.ft * d4p // tank diffuse 1
        this._d5[p & md5] = d4p - this.ft * this._d4[p & md4] // long delay 1

        lp2 += this._dpn * (this._d5[pm & md5] - lp2) // damp 1

        this._d6[p & md6] = this.dc * lp2 - this.st * this._d6[pm & md6] // tank diffuse 2
        this._d7[p & md7] = this._d6[pm & md6] + this.st * this._d6[p & md6] // long delay 2

        // right loop
        d8p = cubic(this._d8, <f32>p - exc2, md8)
        this._d8[p & md8] = split + this.dc * this._d7[pm & md7] + this.ft * d8p // tank diffuse 3
        this._d9[p & md9] = d8p - this.ft * this._d8[p & md8] // long delay 3

        lp3 += this._dpn * this._d9[pm & md9] - lp3 // damp 2

        this._d10[p & md10] = this.dc * lp3 - this.st * this._d10[pm & md10]
        this._d11[p & md11] = this._d10[pm & md10] + this.st * this._d10[p & md10]

        exc_phase += exn

        lo = this._d9[(p - lo0) & md9]
          + this._d9[(p - lo1) & md9]
          - this._d10[(p - lo2) & md10]
          + this._d11[(p - lo3) & md11]
          - this._d5[(p - lo4) & md5]
          - this._d6[(p - lo5) & md6]
          - this._d7[(p - lo6) & md7]


        ro = this._d5[(p - ro0) & md5]
          + this._d5[(p - ro1) & md5]
          - this._d6[(p - ro2) & md6]
          + this._d7[(p - ro3) & md7]
          - this._d9[(p - ro4) & md9]
          - this._d10[(p - ro5) & md10]
          - this._d11[(p - ro6) & md11]


        f32.store(out_0, lo)
        f32.store(out_1, ro)

        inp += 4
        out_0 += 4
        out_1 += 4
        p++
        pm++
      })
    }

    this._index = p & mask
    this._exc_phase = exc_phase % Mathf.PI
    this._lp1 = lp1
    this._lp2 = lp2
    this._lp3 = lp3
  }
}
