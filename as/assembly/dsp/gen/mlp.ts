import { Moog } from './moog'

export class Mlp extends Moog {
  _name: string = 'Mlp'
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
        sample = this._lowpass()
        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
