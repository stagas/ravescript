import { WAVETABLE_SIZE } from './constants'
import { rnd } from '../../util'

// @ts-ignore
@inline const HALF_PI: f64 = Math.PI / 2.0

export class Wave {
  @inline static sine(phase: f64): f64 {
    return Math.sin(phase)
  }

  @inline static saw(phase: f64): f64 {
    return 1.0 - (((phase + Math.PI) / Math.PI) % 2.0)
  }

  @inline static ramp(phase: f64): f64 {
    return (((phase + Math.PI) / Math.PI) % 2.0) - 1.0
  }

  @inline static tri(phase: f64): f64 {
    return 1.0 - Math.abs(1.0 - (((phase + HALF_PI) / Math.PI) % 2.0)) * 2.0
  }

  @inline static sqr(phase: f64): f64 {
    return Wave.ramp(phase) < 0 ? -1 : 1
  }

  @inline static noise(phase: f64): f64 {
    return rnd() * 2.0 - 1.0
  }
}

const numHarmonics: u32 = 16
export class Blit {
  @inline static saw(i: u32): f64 {
    let value: f64 = 0.0
    for (let h: u32 = 1; h <= numHarmonics; h++) {
      const harmonicPhase: f64 = f64(i * h) / f64(WAVETABLE_SIZE)
      const harmonicValue: f64 = Math.sin(harmonicPhase) / f64(h);
      value += harmonicValue;
    }
    return value
  }
}
