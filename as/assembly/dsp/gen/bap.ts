import { Biquad } from './biquad'

export class Bap extends Biquad {
  _name: string = 'Bap'
  cut: f32 = 500
  q: f32 = 0.5

  _update(): void {
    this._allpass(this.cut, this.q)
  }
}
