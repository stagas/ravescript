import { Aosc } from './aosc'

export class Sqr extends Aosc {
  _name: string = 'Sqr'
  get _tables(): StaticArray<StaticArray<f32>> {
    return this._engine.wavetable.antialias.sqr
  }
}
