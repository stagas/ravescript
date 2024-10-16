import { rateToPhaseStep } from '../../util'
import { Engine } from '../core/engine'
import { Gen } from './gen'

export class Rate extends Gen {
  samples: f32
  constructor(public _engine: Engine) {
    super(_engine)
    this.samples = f32(_engine.sampleRate)
  }
  _update(): void {
    this._engine.rateSamples = u32(this.samples)
    this._engine.rateSamplesRecip = (1.0 / f64(this._engine.rateSamples))
    this._engine.rateStep = rateToPhaseStep(u32(this.samples))
    this._engine.samplesPerMs = f64(this._engine.rateSamples) / 1000
  }
}
