import { Svf } from './svf'

export class Sno extends Svf {
  _name: string = 'Sno'
  cut: f32 = 500
  q: f32 = 0.5

  _update(): void {
    this._updateCoeffs(this.cut, this.q)
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

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = f32.load(inp)
        this._process(sample)
        sample = this._notch()
        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
