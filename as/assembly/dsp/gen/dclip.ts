import { Gen } from './gen'

export class Dclip extends Gen {
  _name: string = 'Dclip';
  in: u32 = 0

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

        sample = sample > 0 ? sample : 0

        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
