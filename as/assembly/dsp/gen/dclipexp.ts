import { Gen } from './gen'

export class Dclipexp extends Gen {
  _name: string = 'Dclipexp'
  factor: f32 = 1.0;

  in: u32 = 0

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin
    const factor: f32 = this.factor
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

        sample = f32(Math.exp(f64(sample) / f64(factor)) - 1.0)

        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
