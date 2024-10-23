import { Smp } from './smp'

export class Say extends Smp {
  text: i32 = 0

  _update(): void {
    this._floats = !this.text ? null : changetype<StaticArray<f32>>(this.text)
    super._update()
  }
}
