import { Aosc } from './aosc'

export class Ramp extends Aosc {
  _name: string = 'Ramp'
  get _tables(): StaticArray<StaticArray<f32>> {
    return this._engine.wavetable.antialias.ramp
  }
}
