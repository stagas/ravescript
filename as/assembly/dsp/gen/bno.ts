import { Biquad } from './biquad'

export class Bno extends Biquad {
  _name: string = 'Bno'
  cut: f32 = 500
  q: f32 = 0.5

  _update(): void {
    this._notch(this.cut, this.q)
  }
}
