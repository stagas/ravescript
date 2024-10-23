import { Osc } from './osc'

export class Exp extends Osc {
  _name: string = 'Exp'
  get _table(): StaticArray<f32> {
    return this._engine.wavetable.exp
  }
}
