import { Biquad } from './biquad'

export class Blp extends Biquad {
  _name: string = 'Blp'
  cut: f32 = 500
  q: f32 = 0.5

  _update(): void {
    this._lowpass(this.cut, this.q)
  }
}
