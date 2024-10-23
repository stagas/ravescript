import { Gen } from './gen'

export class Lp extends Gen {
  _name: string = 'Lp'
  cut: f32 = 500;
  in: u32 = 0

  _alpha: f32 = 0
  _sample: f32 = 0

  _update(): void {
    const omega: f32 = 1.0 / (2.0 * Mathf.PI * this.cut)
    const dt: f32 = 1.0 / f32(this._engine.sampleRate)
    this._alpha = dt / (omega + dt)
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin
    const alpha: f32 = this._alpha

    let sample: f32 = 0
    let prev: f32 = this._sample
    let inp: u32 = this.in

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    inp += offset
    out += offset

    for (; i < end; i += 16) {
      unroll(16, () => {
        sample = f32.load(inp)

        sample = alpha * sample + (1.0 - alpha) * prev
        // Store the current sample's value for use in the next iteration
        prev = sample
        f32.store(out, sample)
        inp += 4
        out += 4
      })
    }

    this._sample = prev
  }
}
