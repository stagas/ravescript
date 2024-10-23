import { Gen } from './gen'

export class Clip extends Gen {
  _name: string = 'Clip'
  threshold: f32 = 1.0;
  in: u32 = 0

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin
    const threshold: f32 = this.threshold

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
          sample = threshold
        }
        else if (sample < -threshold) {
          sample = -threshold
        }

        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }
  }
}
