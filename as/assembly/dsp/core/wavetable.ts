import { phaseFrac, phaseToRadians, rateToPhaseStep } from '../../util'
import { AntialiasWavetable } from './antialias-wavetable'
import { Wave } from './wave'

function exp(phase: f64): f64 {
  return Math.exp(-phase)
}

// @ts-ignore
@inline
export function readAtPhase(mask: u32, table: u32, phase: u32, offset: u32): f32 {
  const
    current = phase + offset,
    pos = current >> 14,
    masked = pos & mask,
    index = table + masked,
    a: f32 = load<f32>(index),
    b: f32 = load<f32>(index, 4),
    d: f32 = b - a,
    frac: f32 = phaseFrac(current),
    sample: f32 = a + frac * d
  return sample
}

export class Wavetable {
  length: u32
  mask: u32
  phases: StaticArray<u32>

  sine: StaticArray<f32>
  cos: StaticArray<f32>
  exp: StaticArray<f32>
  // saw: StaticArray<f32>
  // ramp: StaticArray<f32>
  // tri: StaticArray<f32>
  // sqr: StaticArray<f32>
  noise: StaticArray<f32>

  antialias: AntialiasWavetable

  constructor(public sampleRate: u32, public size: u32) {
    // length is overshoot by 1 so that we can interpolate
    // the values at ( index, index+1 ) without an extra & mask operation
    const length = size + 1
    this.length = length
    this.mask = (size - 1) << 2
    this.phases = new StaticArray<u32>(length)

    this.sine = new StaticArray<f32>(length)
    this.cos = new StaticArray<f32>(length)
    this.exp = new StaticArray<f32>(length)
    // this.saw = new StaticArray<f32>(length)
    // this.ramp = new StaticArray<f32>(length)
    // this.tri = new StaticArray<f32>(length)
    // this.sqr = new StaticArray<f32>(length)
    this.noise = new StaticArray<f32>(length)

    this.antialias = new AntialiasWavetable(sampleRate)

    const step: u32 = rateToPhaseStep(this.size)
    for (let i: u32 = 0, phase: u32 = 0; i < this.length; i++) {
      this.phases[i] = phase
      phase += step
    }

    this.fill(this.sine, Math.sin, phaseToRadians)
    this.fill(this.cos, Math.cos, phaseToRadians)
    this.fill(this.exp, exp, phaseToRadians)
    // this.fill(this.saw, Wave.saw, phaseToRadians)
    // this.fill(this.ramp, Wave.ramp, phaseToRadians)
    // this.fill(this.tri, Wave.tri, phaseToRadians)
    // this.fill(this.sqr, Wave.sqr, phaseToRadians)
    this.fill(this.noise, Wave.noise, phaseToRadians)
  }

  create(fn: (phase: f64) => f64, phaser: (phase: u32) => f64): StaticArray<f32> {
    const table = new StaticArray<f32>(this.length)
    this.fill(table, fn, phaser)
    return table
  }

  fill(table: StaticArray<f32>, fn: (phase: f64) => f64, phaser: (phase: u32) => f64): void {
    for (let i: u32 = 0, phase: u32 = 0; i < this.length; i++) {
      phase = this.phases[i]
      table[i] = <f32>fn(phaser(phase))
    }
  }

  fillByIndex(table: StaticArray<f32>, fn: (phase: u32) => f64): void {
    for (let i: u32 = 0; i < this.length; i++) {
      table[i] = <f32>fn(i)
    }
  }

  readAt(wavetable: StaticArray<f32>, phase: u32): f32 {
    const
      mask: u32 = this.mask,
      table: u32 = <u32>changetype<usize>(wavetable),
      pos = phase >> 14,
      masked = pos & mask,
      index = table + masked,
      a: f32 = load<f32>(index),
      b: f32 = load<f32>(index, 4),
      d: f32 = b - a,
      frac: f32 = phaseFrac(phase),
      sample: f32 = a + frac * d

    return sample
  }

  read(
    table: u32,
    mask: u32,
    phase: u32,
    offset: u32,
    step: u32,
    begin: u32,
    end: u32,
    targetPtr: usize
  ): u32 {
    let target: u32 = <u32>targetPtr + (begin << 2)
    let sv: v128 = f32x4(0, 0, 0, 0)

    // multiply length by 4 because f32=4
    end = target + ((end - begin) << 2)

    while (target < end) {
      unroll(4, (): void => {
        sv = f32x4.replace_lane(sv, 0, readAtPhase(mask, table, phase, offset))
        phase += step
        sv = f32x4.replace_lane(sv, 1, readAtPhase(mask, table, phase, offset))
        phase += step
        sv = f32x4.replace_lane(sv, 2, readAtPhase(mask, table, phase, offset))
        phase += step
        sv = f32x4.replace_lane(sv, 3, readAtPhase(mask, table, phase, offset))
        store<v128>(target, sv)

        // advance pointer 4x4 because of simd x4 + f32 len 4
        target += 16

        phase += step
      })
    }

    return phase
  }
}
