import { Osc } from './osc'

export class Sin extends Osc {
  get _table(): StaticArray<f32> {
    return this._engine.wavetable.sine
  }
}
