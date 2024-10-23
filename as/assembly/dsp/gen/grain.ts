import { Gen } from './gen'
import { rnd } from '../../util'

export class Grain extends Gen {
  amt: f32 = 1.0;

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    out += offset

    let value: f32 = 0

    for (; i < end; i += 16) {
      unroll(16, () => {

        value = (f32(rnd()) < this.amt ? f32(rnd()) : 0.0)
        f32.store(out, value)

        out += 4
      })
    }
  }
}
