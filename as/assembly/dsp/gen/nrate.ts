import { rateToPhaseStep } from '../../util'
import { Engine } from '../core/engine'
import { Gen } from './gen'

export class Nrate extends Gen {
  normal: f32 = 1.0
  _reset(): void {
    this.normal = 1.0
    this._update()
  }
  _update(): void {
    let samples: u32 = u32(f32(this._engine.sampleRate) * this.normal)
    if (samples < 1) samples = 1

    this._engine.rateSamples = samples
    this._engine.rateSamplesRecip = (1.0 / f64(this._engine.rateSamples))
    this._engine.rateStep = rateToPhaseStep(samples)
    this._engine.samplesPerMs = f64(this._engine.rateSamples) / 1000
  }
}
