import { clamp } from '../../util'
import { Gen } from './gen'

enum AdsrState {
  Release,
  Attack,
  Decay,
}

export class Adsr extends Gen {
  attack: f32 = 1 // ms
  decay: f32 = 200
  sustain: f32 = 0.1
  release: f32 = 500

  /** Trigger */
  on: f32 = -1.0
  _lastOn: i32 = -1
  off: f32 = -1.0
  _lastOff: i32 = -1

  _state: AdsrState = AdsrState.Release

  _step: f32 = 0
  _pos: i32 = 0
  _value: f32 = 0
  _decayAt: i32 = 0
  _bottom: f32 = 0

  _update(): void {
    // On
    if (this._lastOn !== i32(this.on)) {
      this._lastOn = i32(this.on)

      // (any) -> Attack
      this._state = AdsrState.Attack
      this._step = f32(f64(1.0 / (f64(this.attack) * this._engine.samplesPerMs)))
      this._pos = 0
      this._decayAt = i32(f64(this.attack) * this._engine.samplesPerMs)
      this._bottom = 0
    }

    // Off
    if (this._lastOff !== i32(this.off)) {
      this._lastOff = i32(this.off)

      // (any) -> Release
      this._state = AdsrState.Release
      this._step = -f32(f64(this._value / (f64(this.release) * this._engine.samplesPerMs)))
      this._pos = 0
      this._bottom = 0
    }

    if (this._state === AdsrState.Attack) {
      // Attack -> Decay
      if (this._pos >= this._decayAt) {
        this._state = AdsrState.Decay
        this._step = -f32(f64((1.0 - this.sustain) / (f64(this.decay) * this._engine.samplesPerMs)))
        this._pos = 0
        this._bottom = this.sustain
      }
    }
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    out += offset

    const step: f32 = this._step
    const bottom: f32 = this._bottom

    let value: f32 = this._value

    for (; i < end; i += 16) {
      unroll(16, () => {
        value = clamp(bottom, 1, 0, (value + step))
        f32.store(out, value)
        out += 4
      })
    }

    this._value = value
    this._pos = this._pos + i32(length)
  }
}
