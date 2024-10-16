import { Biquad } from './biquad'

export class Bls extends Biquad {
  cut: f32 = 500
  q: f32 = 0.5
  amt: f32 = 1

  _update(): void {
    this._lowshelf(this.cut, this.q, this.amt)
  }
}
