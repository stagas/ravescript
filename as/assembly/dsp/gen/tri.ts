import { Aosc } from './aosc'

export class Tri extends Aosc {
  _name: string = 'Tri'
  get _tables(): StaticArray<StaticArray<f32>> {
    return this._engine.wavetable.antialias.tri
  }
}
