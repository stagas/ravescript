import { Gen } from './gen'

export class Dcc extends Gen {
  _name: string = 'Dcc'
  ceil: f32 = 0.2;
  in: u32 = 0

  sample: f32 = 0

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin
    const ceil: f32 = this.ceil
    let prev: f32 = this.sample
    let sample: f32 = 0
    let next: f32 = 0
    let diff: f32 = 0
    let abs: f32 = 0
    let inp: u32 = this.in

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    inp += offset
    out += offset

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = f32.load(inp)
        diff = sample - prev
        abs = Mathf.abs(diff)
        if (abs > ceil) {
          next = prev + diff * (abs - ceil)
        }
        else {
          next = sample
        }
        prev = next
        f32.store(out, next)
        inp += 4
        out += 4
      })
    }

    this.sample = prev
  }
}
