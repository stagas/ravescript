import { Gen } from './gen'

export class Inc extends Gen {
  _name: string = 'Inc'
  amt: f32 = 1.0;

  /** Trigger phase sync when set to 0. */
  trig: f32 = -1.0
  _lastTrig: i32 = -1

  _value: f32 = 0.0

  _reset(): void {
    this.trig = -1.0
    this._lastTrig = -1
  }

  _update(): void {
    if (this._lastTrig !== i32(this.trig)) {
      this._value = 0.0
    }

    this._lastTrig = i32(this.trig)
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin
    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    out += offset
    const amt: f32 = this.amt * 0.001
    let value: f32 = this._value

    for (; i < end; i += 16) {
      unroll(16, () => {
        f32.store(out, value)
        value += amt
        out += 4
      })
    }

    this._value = value
  }
}
