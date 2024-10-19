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

export type PlayerTrack = typeof PlayerTrack.type

export const PlayerTrack = Struct({
  sound$: 'usize',
  ops$: 'usize',
  notes$: 'usize',
  notesCount: 'u32',
  params$: 'usize',
  paramsCount: 'u32',
  audio_LR$: 'i32',
  out$: 'usize',
})

export const Out = Struct({
  L$: 'usize',
  R$: 'usize',
})
