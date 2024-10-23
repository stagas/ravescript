import { add_audio_audio, add_audio_scalar, div_audio_audio, div_audio_scalar, div_scalar_audio, mul_audio_audio, mul_audio_scalar, pow_audio_audio, pow_audio_scalar, pow_scalar_audio, sub_audio_audio, sub_audio_scalar, sub_scalar_audio } from '../graph/math'
import { DspBinaryOp } from './dsp-shared'

export type BinOpScalarScalar = (lhs: f32, rhs: f32) => f32
export type BinOpScalarAudio = (lhs: f32, rhs: i32, begin: i32, end: i32, out: i32) => void
export type BinOpAudioScalar = (lhs: i32, rhs: f32, begin: i32, end: i32, out: i32) => void
export type BinOpAudioAudio = (lhs: i32, rhs: i32, begin: i32, end: i32, out: i32) => void

export const BinOpScalarScalar: Map<DspBinaryOp, BinOpScalarScalar> = new Map()
BinOpScalarScalar.set(DspBinaryOp.Add, (lhs: f32, rhs: f32): f32 => lhs + rhs)
BinOpScalarScalar.set(DspBinaryOp.Mul, (lhs: f32, rhs: f32): f32 => lhs * rhs)
BinOpScalarScalar.set(DspBinaryOp.Sub, (lhs: f32, rhs: f32): f32 => lhs - rhs)
BinOpScalarScalar.set(DspBinaryOp.Div, (lhs: f32, rhs: f32): f32 => lhs / rhs)
BinOpScalarScalar.set(DspBinaryOp.Pow, (lhs: f32, rhs: f32): f32 => Mathf.pow(lhs, rhs))

export const BinOpScalarAudio: Map<DspBinaryOp, BinOpScalarAudio> = new Map()
BinOpScalarAudio.set(DspBinaryOp.Add, (lhs: f32, rhs: i32, begin: i32, end: i32, out: i32): void => add_audio_scalar(rhs, lhs, begin, end, out))
BinOpScalarAudio.set(DspBinaryOp.Mul, (lhs: f32, rhs: i32, begin: i32, end: i32, out: i32): void => mul_audio_scalar(rhs, lhs, begin, end, out))
BinOpScalarAudio.set(DspBinaryOp.Sub, (lhs: f32, rhs: i32, begin: i32, end: i32, out: i32): void => sub_scalar_audio(lhs, rhs, begin, end, out))
BinOpScalarAudio.set(DspBinaryOp.Div, (lhs: f32, rhs: i32, begin: i32, end: i32, out: i32): void => div_scalar_audio(lhs, rhs, begin, end, out))
BinOpScalarAudio.set(DspBinaryOp.Pow, (lhs: f32, rhs: i32, begin: i32, end: i32, out: i32): void => pow_scalar_audio(lhs, rhs, begin, end, out))

export const BinOpAudioScalar: Map<DspBinaryOp, BinOpAudioScalar> = new Map()
BinOpAudioScalar.set(DspBinaryOp.Add, (lhs: i32, rhs: f32, begin: i32, end: i32, out: i32): void => add_audio_scalar(lhs, rhs, begin, end, out))
BinOpAudioScalar.set(DspBinaryOp.Mul, (lhs: i32, rhs: f32, begin: i32, end: i32, out: i32): void => mul_audio_scalar(lhs, rhs, begin, end, out))
BinOpAudioScalar.set(DspBinaryOp.Sub, (lhs: i32, rhs: f32, begin: i32, end: i32, out: i32): void => sub_audio_scalar(lhs, rhs, begin, end, out))
BinOpAudioScalar.set(DspBinaryOp.Div, (lhs: i32, rhs: f32, begin: i32, end: i32, out: i32): void => div_audio_scalar(lhs, rhs, begin, end, out))
BinOpAudioScalar.set(DspBinaryOp.Pow, (lhs: i32, rhs: f32, begin: i32, end: i32, out: i32): void => pow_audio_scalar(lhs, rhs, begin, end, out))

export const BinOpAudioAudio: Map<DspBinaryOp, BinOpAudioAudio> = new Map()
BinOpAudioAudio.set(DspBinaryOp.Add, (lhs: i32, rhs: i32, begin: i32, end: i32, out: i32): void => add_audio_audio(lhs, rhs, begin, end, out))
BinOpAudioAudio.set(DspBinaryOp.Mul, (lhs: i32, rhs: i32, begin: i32, end: i32, out: i32): void => mul_audio_audio(rhs, lhs, begin, end, out))
BinOpAudioAudio.set(DspBinaryOp.Sub, (lhs: i32, rhs: i32, begin: i32, end: i32, out: i32): void => sub_audio_audio(lhs, rhs, begin, end, out))
BinOpAudioAudio.set(DspBinaryOp.Div, (lhs: i32, rhs: i32, begin: i32, end: i32, out: i32): void => div_audio_audio(lhs, rhs, begin, end, out))
BinOpAudioAudio.set(DspBinaryOp.Pow, (lhs: i32, rhs: i32, begin: i32, end: i32, out: i32): void => pow_audio_audio(lhs, rhs, begin, end, out))
