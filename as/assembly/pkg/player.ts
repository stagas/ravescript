import { rand } from './rand'
import { Out } from './shared'

export class Player {
  constructor(public sampleRate: u32) { }
  process(begin: u32, end: u32, out$: usize): void {
    const out = changetype<Out>(out$)
    const out_L = out.L$
    const out_R = out.R$

    let pos: u32 = begin
    let offset: u32
    let sample: f32

    for (; pos < end; pos++) {
      offset = pos << 2
      sample = 0.1 * rand() as f32
      store<f32>(out_L + offset, sample)
      store<f32>(out_R + offset, sample)
    }
  }
}
