import { Biquad } from './biquad'

export class Bbp extends Biquad {
  _name: string = 'Bbp'
  cut: f32 = 500
  q: f32 = 0.5

  _update(): void {
    this._bandpass(this.cut, this.q)
  }
}
