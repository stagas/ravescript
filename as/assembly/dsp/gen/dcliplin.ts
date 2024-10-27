import { Gen } from './gen'

export class Dcliplin extends Gen {
  _name: string = 'Dcliplin';
  threshold: f32 = 0.5;
  factor: f32 = 0.5;
  in: u32 = 0

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin
    const threshold: f32 = this.threshold
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

        if (sample > threshold) {
          sample = threshold + (sample - threshold) * factor
        } else if (sample < -threshold) {
          sample = -threshold + (sample + threshold) * factor
        }

        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
