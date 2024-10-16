import { Gen } from './gen'

export class Comp extends Gen {
  threshold: f32 = 0.7
  ratio: f32 = 1 / 3
  attack: f32 = 0.01
  release: f32 = 0.01;

  in: u32 = 0;
  sidechain: u32 = 0;

  _prevLevel: f32 = 0;
  _gainReduction: f32 = 1;

  // attackRecip: f32 = 0
  // releaseRecip: f32 = 0

  _update(): void {
    // this.releaseRecip = f32(1.0 / (<f64>Mathf.max(0.1, this.release) * 0.001 * <f64>this.engine.ratesSamples[Rate.Audio]))
  }

  _audio(begin: u32, end: u32, out: usize): void {
    const length: u32 = end - begin

    let sample: f32 = 0
    let sideSample: f32 = 0
    let inp: u32 = this.in

    let i: u32 = begin
    end = i + length

    const offset = begin << 2
    inp += offset
    out += offset

    let diff: f32
    let targetReduction: f32
    let gainReduction: f32 = this._gainReduction

    const threshold: f32 = this.threshold

    const ratio: f32 = this.ratio
    const attack: f32 = this.attack
    const release: f32 = this.release

    let side: u32 = this.sidechain

    if (side) {
      side += offset

      for (; i < end; i += 16) {
        unroll(16, () => {
          sample = f32.load(inp)
          sideSample = f32.load(side)

          diff = Mathf.max(0.0, Mathf.abs(sideSample) - threshold) * ratio

          targetReduction = diff
          if (targetReduction > gainReduction) {
            gainReduction = gainReduction + (targetReduction - gainReduction) * attack
          }
          else {
            gainReduction = gainReduction + (targetReduction - gainReduction) * release
          }

          sample = sample * (1.0 - gainReduction)

          f32.store(out, sample)

          inp += 4
          out += 4
          side += 4
        })
      }
    }
    else {
      for (; i < end; i += 16) {
        unroll(16, () => {
          sample = f32.load(inp)

          diff = Mathf.max(0.0, Mathf.abs(sample) - threshold) * ratio

          targetReduction = diff
          if (targetReduction > gainReduction) {
            gainReduction = gainReduction + (targetReduction - gainReduction) * attack
          }
          else {
            gainReduction = gainReduction + (targetReduction - gainReduction) * release
          }

          sample = sample * (1.0 - gainReduction)

          f32.store(out, sample)

          inp += 4
          out += 4
        })
      }
    }

    this._gainReduction = gainReduction
  }
}
