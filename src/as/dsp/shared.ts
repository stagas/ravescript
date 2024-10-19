import { Struct } from 'utils'

export const enum DspWorkletMode {
  Idle,
  Reset,
  Stop,
  Play,
  Pause,
}

export type Clock = typeof Clock.type

export const Clock = Struct({
  time: 'f64',
  timeStep: 'f64',
  prevTime: 'f64',
  startTime: 'f64',
  endTime: 'f64',
  bpm: 'f64',
  coeff: 'f64',
  barTime: 'f64',
  barTimeStep: 'f64',
  loopStart: 'f64',
  loopEnd: 'f64',
  sampleRate: 'u32',
  jumpBar: 'i32',
  ringPos: 'u32',
  nextRingPos: 'u32',
})

export type Track = typeof Track.type

export const Track = Struct({
  run_ops$: 'usize',
  setup_ops$: 'usize',
  literals$: 'usize',
  lists$: 'usize',
  audio_LR$: 'i32',
})

export const Out = Struct({
  L$: 'usize',
  R$: 'usize',
})
