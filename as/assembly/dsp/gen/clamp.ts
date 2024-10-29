import { Gen } from './gen'

export class Clamp extends Gen {
  _name: string = 'Clamp'
  min: f32 = -0.5;
  max: f32 = 0.5;
  in: u32 = 0

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin
    const min: f32 = this.min
    const max: f32 = this.max

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

        if (sample > max) {
          sample = max
        }
        else if (sample < min) {
          sample = min
        }

        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
