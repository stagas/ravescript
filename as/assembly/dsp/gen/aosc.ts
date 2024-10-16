import { Osc } from './osc'

export class Aosc extends Osc {
  get _tables(): StaticArray<StaticArray<f32>> {
    return this._engine.wavetable.antialias.saw
  }

  get _table(): StaticArray<f32> {
    return this._tables[this._tableIndex]
  }

  get _mask(): u32 {
    return this._engine.wavetable.antialias.tableMask
  }

  _tableIndex: u32 = 0

  _update(): void {
    super._update()
    this._tableIndex = this._engine.wavetable.antialias.getTableIndex(this.hz)
    const stepShift: i32 = this._engine.wavetable.antialias.stepShift
    this._step = stepShift < 0
      ? this._step << (-stepShift)
      : this._step >> stepShift
  }
}
