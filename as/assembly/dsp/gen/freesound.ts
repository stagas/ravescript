import { Smp } from './smp'

export class Freesound extends Smp {
  _name: string = 'Freesound';
  id: i32 = 0

  _update(): void {
    this._floats = !this.id ? null : changetype<StaticArray<f32>>(this.id)
    super._update()
  }
}
