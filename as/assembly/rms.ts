import { BUFFER_SIZE } from './dsp/constants'
import { rms } from './dsp/graph/rms'
import { clamp01 } from './util'

export const floats = changetype<usize>(new StaticArray<f32>(BUFFER_SIZE))

export function run(): f32 {
  return clamp01(rms(changetype<usize>(floats), 0, BUFFER_SIZE))
}
