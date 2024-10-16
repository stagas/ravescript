import { Biquad } from './biquad'

export class Bhs extends Biquad {
  cut: f32 = 500
  q: f32 = 0.5
  amt: f32 = 1

  _update(): void {
    this._highshelf(this.cut, this.q, this.amt)
  }
}
