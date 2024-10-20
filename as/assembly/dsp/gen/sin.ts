import { Osc } from './osc'

export class Sin extends Osc {
  _name: string = 'Sin'
  get _table(): StaticArray<f32> {
    return this._engine.wavetable.sine
  }
}
