import { Osc } from './osc'

export class Noi extends Osc {
  _name: string = 'Noi'
  get _table(): StaticArray<f32> {
    return this._engine.wavetable.noise
  }
}
