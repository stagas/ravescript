import { cubic } from '../../util'
import { DELAY_MAX_SIZE } from '../core/constants'
import { Gen } from './gen'

export class Tap extends Gen {
  _name: string = 'Tap'
  ms: f32 = 200;
  in: u32 = 0;

  _floats: StaticArray<f32> = new StaticArray<f32>(DELAY_MAX_SIZE)
  _mask: u32 = DELAY_MAX_SIZE - 1
  _index: u32 = 0
  _stepf: f32 = 0
  _targetf: f32 = 0

  _update(): void {
    this._targetf = Mathf.min(<f32>DELAY_MAX_SIZE - 1, (this.ms * 0.001) * <f32>this._engine.rateStep)
    if (this._stepf === 0) this._stepf = this._targetf
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin

    let sample: f32 = 0
    let inp: u32 = this.in

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    inp += offset
    out += offset

    const mask: u32 = this._mask
    let index: u32 = this._index
    let delay: f32 = 0
    let stepf: f32 = this._stepf
    const targetf: f32 = this._targetf

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = f32.load(inp)

        delay = cubic(this._floats, (<f32>index - stepf), mask)
        this._floats[index] = sample
        f32.store(out, delay)

        inp += 4
        out += 4

        index = (index + 1) & mask
        stepf += (targetf - stepf) * 0.0008
      })
    }

    this._index = index
    this._stepf = stepf
  }
}
