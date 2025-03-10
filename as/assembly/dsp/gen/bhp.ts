import { Biquad } from './biquad'

export class Bhp extends Biquad {
  _name: string = 'Bhp'
  cut: f32 = 500
  q: f32 = 0.5

  _update(): void {
    this._highpass(this.cut, this.q)
  }
}
