import { Biquad } from './biquad'

export class Bpk extends Biquad {
  cut: f32 = 500
  q: f32 = 0.5
  amt: f32 = 1

  _update(): void {
    this._peak(this.cut, this.q, this.amt)
  }
}
