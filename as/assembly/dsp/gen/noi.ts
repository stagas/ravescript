import { Osc } from './osc'

export class Noi extends Osc {
  get _table(): StaticArray<f32> {
    return this._engine.wavetable.noise
  }
}
