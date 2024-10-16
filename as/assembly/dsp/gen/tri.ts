import { Aosc } from './aosc'

export class Tri extends Aosc {
  get _tables(): StaticArray<StaticArray<f32>> {
    return this._engine.wavetable.antialias.tri
  }
}
