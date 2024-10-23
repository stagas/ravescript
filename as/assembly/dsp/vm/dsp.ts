import { Factory } from '../../../../generated/assembly/dsp-factory'
import { Offsets } from '../../../../generated/assembly/dsp-offsets'
import { modWrap } from '../../util'
import { Gen } from '../gen/gen'
import { fill } from '../graph/fill'
import { BinOpAudioAudio, BinOpAudioScalar, BinOpScalarAudio, BinOpScalarScalar } from './bin-op'
import { DspBinaryOp, SoundValueKind } from './dsp-shared'
import { Sound } from './sound'

export { DspBinaryOp }

export class Dsp {
  constructor() { }

  @inline
  CreateGen(snd: Sound, kind_index: i32): void {
    const Gen = Factory[kind_index]
    let gen = Gen(snd.engine)
    for (let i = 0; i < snd.prevGens.length; i++) {
      const prevGen: Gen = snd.prevGens[i]
      const isSameClass: boolean = prevGen._name === gen._name
      if (isSameClass) {
        gen = prevGen
        snd.prevGens.splice(i, 1)
        break
      }
    }
    snd.gens.push(gen)
    snd.offsets.push(Offsets[kind_index])
  }
  @inline
  CreateAudios(snd: Sound, count: i32): void {
    // for (let x = 0; x <= count; x++) {
    //   snd.audios.push(new StaticArray<f32>(BUFFER_SIZE))
    // }
  }
  @inline
  CreateValues(snd: Sound, count: i32): void {
    // for (let x = 0; x < count; x++) {
    //   snd.values.push(new SoundValue(SoundValueKind.Null, 0))
    // }
  }
  @inline
  AudioToScalar(snd: Sound, audio$: i32, scalar$: i32): void {
    const yf: f32 = f32.load(
      changetype<usize>(snd.audios[audio$]) + (snd.begin << 2)
    )
    snd.scalars[scalar$] = yf
  }
  @inline
  LiteralToAudio(snd: Sound, literal$: i32, audio$: i32): void {
    const xf: f32 = snd.literals[literal$]
    fill(
      xf,
      snd.begin,
      snd.end,
      i32(changetype<usize>(snd.audios[audio$]))
    )
  }
  @inline
  Pick(snd: Sound, list$: i32, list_length: i32, list_index_value$: i32, out_value$: i32): void {
    const list_index = snd.values[list_index_value$]
    const out_value = snd.values[out_value$]

    let vf: f32 = 0.0

    switch (list_index.kind) {
      case SoundValueKind.Literal:
        vf = snd.literals[list_index.ptr]
        break
      case SoundValueKind.Scalar:
        vf = snd.scalars[list_index.ptr]
        break
      case SoundValueKind.Audio:
        vf = f32.load(
          changetype<usize>(snd.audios[list_index.ptr]) + (snd.begin << 2)
        )
        break
    }

    const index = i32(modWrap(f64(vf), f64(list_length)))
    const x = list$ + index
    const value = snd.values[snd.lists[x]]
    out_value.kind = value.kind
    out_value.ptr = value.ptr
  }
  @inline
  Pan(snd: Sound, value$: i32): void {
    const value = snd.values[value$]
    switch (value.kind) {
      case SoundValueKind.Literal:
        snd.pan = snd.literals[value.ptr]
        break
      case SoundValueKind.Scalar:
        snd.pan = snd.scalars[value.ptr]
        break
      case SoundValueKind.Audio:
        snd.pan = f32.load(
          changetype<usize>(snd.audios[value.ptr]) + (snd.begin << 2)
        )
        break
    }
  }
  @inline
  SetValue(snd: Sound, value$: i32, kind: i32, ptr: i32): void {
    const value = snd.values[value$]
    value.kind = kind
    value.ptr = ptr
  }
  @inline
  SetValueDynamic(snd: Sound, value$: i32, scalar$: i32, audio$: i32): void {
    const value = snd.values[value$]
    value.kind = SoundValueKind.Dynamic
    value.scalar$ = scalar$
    value.audio$ = audio$
  }
  @inline
  SetProperty(snd: Sound, gen$: i32, prop$: i32, kind: i32, value$: i32): void {
    const gen = snd.gens[gen$]
    const offsets = snd.offsets[gen$]
    const u = offsets[prop$]
    const value = snd.values[value$]
    const ptr = changetype<usize>(gen) + u
    let xf: f32
    let x: i32
    switch (kind) {
      case SoundValueKind.Scalar:
        switch (value.kind) {
          case SoundValueKind.I32:
            i32.store(ptr, value.ptr)
            break
          case SoundValueKind.Literal:
            xf = snd.literals[value.ptr]
            f32.store(ptr, xf)
            break
          case SoundValueKind.Scalar:
            xf = snd.scalars[value.ptr]
            f32.store(ptr, xf)
            break
          case SoundValueKind.Audio:
            xf = f32.load(
              changetype<usize>(snd.audios[value.ptr]) + (snd.begin << 2)
            )
            f32.store(ptr, xf)
            break
          default:
            throw new Error('Invalid binary op.')
        }
        break

      case SoundValueKind.Audio:
        switch (value.kind) {
          case SoundValueKind.Audio:
            x = i32(changetype<usize>(snd.audios[value.ptr]))
            i32.store(ptr, x)
            break
        }
        break

      case SoundValueKind.Floats:
        x = snd.floats[value.ptr]
        i32.store(ptr, x)
        break

      default:
        throw new Error('Invalid property write.')
    }
  }
  @inline
  UpdateGen(snd: Sound, gen$: i32): void {
    const gen = snd.gens[gen$]
    gen._update()
  }
  @inline
  ProcessAudio(snd: Sound, gen$: i32, audio$: i32): void {
    const gen = snd.gens[gen$]
    gen._update()
    gen._audio(snd.begin, snd.end,
      changetype<usize>(snd.audios[audio$])
    )
  }
  @inline
  ProcessAudioStereo(snd: Sound, gen$: i32, audio_0$: i32, audio_1$: i32): void {
    const gen = snd.gens[gen$]
    gen._update()
    gen._audio_stereo(snd.begin, snd.end,
      changetype<usize>(snd.audios[audio_0$]),
      changetype<usize>(snd.audios[audio_1$]),
    )
  }
  @inline
  BinaryOp(snd: Sound, op: DspBinaryOp, lhs$: i32, rhs$: i32, out$: i32): void {
    const lhs_value = snd.values[lhs$]
    const rhs_value = snd.values[rhs$]
    const out_value = snd.values[out$]

    let binOpScalarScalar: BinOpScalarScalar
    let binOpScalarAudio: BinOpScalarAudio
    let binOpAudioScalar: BinOpAudioScalar
    let binOpAudioAudio: BinOpAudioAudio

    let xf: f32
    let yf: f32
    let x: i32
    let y: i32
    let z: i32

    switch (lhs_value.kind) {
      case SoundValueKind.Literal:
      case SoundValueKind.Scalar:
        if (lhs_value.kind === SoundValueKind.Scalar) {
          xf = snd.scalars[lhs_value.ptr]
        }
        else if (lhs_value.kind === SoundValueKind.Literal) {
          xf = snd.literals[lhs_value.ptr]
        }
        else {
          throw 'unreachable'
        }
        switch (rhs_value.kind) {
          case SoundValueKind.Literal:
            binOpScalarScalar = BinOpScalarScalar.get(op)
            yf = snd.literals[rhs_value.ptr]
            out_value.kind = SoundValueKind.Scalar
            out_value.ptr = out_value.scalar$
            snd.scalars[out_value.ptr] = binOpScalarScalar(xf, yf)
            break
          case SoundValueKind.Scalar:
            binOpScalarScalar = BinOpScalarScalar.get(op)
            yf = snd.scalars[rhs_value.ptr]
            out_value.kind = SoundValueKind.Scalar
            out_value.ptr = out_value.scalar$
            snd.scalars[out_value.ptr] = binOpScalarScalar(xf, yf)
            break
          case SoundValueKind.Audio:
            binOpScalarAudio = BinOpScalarAudio.get(op)
            out_value.kind = SoundValueKind.Audio
            out_value.ptr = out_value.audio$
            y = i32(changetype<usize>(snd.audios[rhs_value.ptr]))
            z = i32(changetype<usize>(snd.audios[out_value.ptr]))
            binOpScalarAudio(xf, y, snd.begin, snd.end, z)
            break
        }
        break
      case SoundValueKind.Audio:
        x = i32(changetype<usize>(snd.audios[lhs_value.ptr]))
        z = i32(changetype<usize>(snd.audios[out_value.ptr]))
        switch (rhs_value.kind) {
          case SoundValueKind.Literal:
            binOpAudioScalar = BinOpAudioScalar.get(op)
            yf = snd.literals[rhs_value.ptr]
            out_value.kind = SoundValueKind.Audio
            out_value.ptr = out_value.audio$
            binOpAudioScalar(x, yf, snd.begin, snd.end, z)
            break
          case SoundValueKind.Scalar:
            binOpAudioScalar = BinOpAudioScalar.get(op)
            yf = snd.scalars[rhs_value.ptr]
            out_value.kind = SoundValueKind.Audio
            out_value.ptr = out_value.audio$
            binOpAudioScalar(x, yf, snd.begin, snd.end, z)
            break
          case SoundValueKind.Audio:
            binOpAudioAudio = BinOpAudioAudio.get(op)
            out_value.kind = SoundValueKind.Audio
            out_value.ptr = out_value.audio$
            y = i32(changetype<usize>(snd.audios[rhs_value.ptr]))
            binOpAudioAudio(x, y, snd.begin, snd.end, z)
            break
        }
        break
    }
  }
}
