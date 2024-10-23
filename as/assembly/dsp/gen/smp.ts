import { clamp, clamp64, cubicMod } from '../../util'
import { Gen } from './gen'

export class Smp extends Gen {
  offset: f32 = 0
  length: f32 = 1

  trig: f32 = 0
  _lastTrig: i32 = -1

  _floats: StaticArray<f32> | null = null
  _floatsSampleRate: f64 = 48000

  _index: f64 = 0
  _step: f64 = 0

  _offsetCurrent: f64 = -1
  _offsetTarget: f64 = 0

  _initial: boolean = true

  _reset(): void {
    this._initial = true
    this.offset = 0
    this.length = 1
  }

  _update(): void {
    this._offsetTarget = f64(this.offset)

    if (this._initial) {
      this._offsetCurrent = this._offsetTarget
    }

    if (this._initial || this._lastTrig !== i32(this.trig)) {
      this._initial = false
      this._index = 0
    }

    this._lastTrig = i32(this.trig)
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const floats: StaticArray<f32> | null = this._floats
    if (!floats) return

    const length: u32 = u32(Math.floor(f64(clamp(0, 1, 1, this.length) ) * f64(floats.length)))
    let offsetCurrent: f64 = f64(clamp64(0, 1, 0, this._offsetCurrent))
    const offsetTarget: f64 = f64(clamp64(0, 1, 0, this._offsetTarget))

    const step: f64 = this._floatsSampleRate / this._engine.rateSamples
    let index: f64 = this._index
    let sample: f32
    let i: u32 = begin

    out += begin << 2

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = cubicMod(floats, index + offsetCurrent * f64(floats.length), length)
        f32.store(out, sample)
        out += 4
        index += step
        offsetCurrent += (offsetTarget - offsetCurrent) * 0.0008
      })
    }

    this._index = index % f64(length)
    this._offsetCurrent = offsetCurrent
  }
}
// import { DELAY_MAX_SIZE, SAMPLE_MAX_SIZE } from '../core/constants'
// import { logd, logf, logi } from '../../env'
// import { cubic, cubicFrac, phaseFrac } from '../../util'
// import { Gen } from './gen'

// export class Sample extends Gen {
//   offset: f32 = 0;
//   trig: f32 = 0

//   _floats: StaticArray<f32> = new StaticArray<f32>(SAMPLE_MAX_SIZE)
//   _mask: u32 = SAMPLE_MAX_SIZE - 1
//   _phase: u32 = 0
//   _step: u32 = 0
//   _offsetCurrent: f64 = -1
//   _offsetTarget: f64 = 0

//   _lastTrig: f32 = -1

//   _update(): void {
//     this._offsetTarget = <f64>this.offset * <f64>(this._engine.rateStep >> 2) + <f64>this._mask
//     if (this._offsetCurrent === -1) this._offsetCurrent = this._offsetTarget
//     this.offset = 0

//     if (this._lastTrig !== 0 && this.trig === 0) {
//       this._phase = 0
//     }

//     this._lastTrig = this.trig
//   }

//   _audio(begin: u32, end: u32, out: usize): void {
//     const mask: u32 = this._mask
//     const step: u32 = this._engine.rateStep >> 2

//     let offsetCurrent: f64 = this._offsetCurrent
//     const offsetTarget: f64 = this._offsetTarget

//     let phase: u32 = this._phase
//     let index: u32
//     let sample: f32
//     let frac: f32
//     let offset: u32

//     let i: u32 = begin

//     out += begin << 2

//     for (; i < end; i += 16) {
//       unroll(16, () => {
//         offset = phase >> 14
//         index = (offset + u32(offsetCurrent)) & mask
//         frac = phaseFrac(phase)
//         sample = cubicFrac(this._floats, index, frac, mask)
//         f32.store(out, sample)
//         out += 4
//         phase += step
//         offsetCurrent += (offsetTarget - offsetCurrent) * 0.0008
//       })
//     }

//     this._phase = phase
//     this._offsetCurrent = offsetCurrent
//   }
// }
