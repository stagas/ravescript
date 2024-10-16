import { Osc } from './osc'

export class Exp extends Osc {
  get _table(): StaticArray<f32> {
    return this._engine.wavetable.exp
  }
}
