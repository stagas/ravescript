// TypeScript VM Producer Factory
// auto-generated from scripts
import { Op } from '~/generated/assembly/dsp-op.ts'
import { DEBUG } from '~/src/as/dsp/constants.ts'

type usize = number
type i32 = number
type u32 = number
type f32 = number

export type DspVm = ReturnType<typeof createVm>

export function createVm(ops: Int32Array) {
  const ops_i32 = ops
  const ops_u32 = new Uint32Array(ops.buffer, ops.byteOffset, ops.length)
  const ops_f32 = new Float32Array(ops.buffer, ops.byteOffset, ops.length)
  let i = 0
  return {
    get index() {
      return i
    },
    Begin(): void {
      DEBUG && console.log('Begin')
      i = 0
    },
    End(): number {
      DEBUG && console.log('End')
      ops_u32[i++] = 0
      return i
    },
    CreateGen(kind_index: i32): void {
      DEBUG && console.log('CreateGen', kind_index)
      ops_u32[i++] = Op.CreateGen
      ops_i32[i++] = kind_index
    },
    CreateAudios(count: i32): void {
      DEBUG && console.log('CreateAudios', count)
      ops_u32[i++] = Op.CreateAudios
      ops_i32[i++] = count
    },
    CreateValues(count: i32): void {
      DEBUG && console.log('CreateValues', count)
      ops_u32[i++] = Op.CreateValues
      ops_i32[i++] = count
    },
    AudioToScalar(audio$: i32, scalar$: i32): void {
      DEBUG && console.log('AudioToScalar', audio$, scalar$)
      ops_u32[i++] = Op.AudioToScalar
      ops_i32[i++] = audio$
      ops_i32[i++] = scalar$
    },
    LiteralToAudio(literal$: i32, audio$: i32): void {
      DEBUG && console.log('LiteralToAudio', literal$, audio$)
      ops_u32[i++] = Op.LiteralToAudio
      ops_i32[i++] = literal$
      ops_i32[i++] = audio$
    },
    Pick(list$: i32, list_length: i32, list_index_value$: i32, out_value$: i32): void {
      DEBUG && console.log('Pick', list$, list_length, list_index_value$, out_value$)
      ops_u32[i++] = Op.Pick
      ops_i32[i++] = list$
      ops_i32[i++] = list_length
      ops_i32[i++] = list_index_value$
      ops_i32[i++] = out_value$
    },
    Pan(value$: i32): void {
      DEBUG && console.log('Pan', value$)
      ops_u32[i++] = Op.Pan
      ops_i32[i++] = value$
    },
    SetValue(value$: i32, kind: i32, ptr: i32): void {
      DEBUG && console.log('SetValue', value$, kind, ptr)
      ops_u32[i++] = Op.SetValue
      ops_i32[i++] = value$
      ops_i32[i++] = kind
      ops_i32[i++] = ptr
    },
    SetValueDynamic(value$: i32, scalar$: i32, audio$: i32): void {
      DEBUG && console.log('SetValueDynamic', value$, scalar$, audio$)
      ops_u32[i++] = Op.SetValueDynamic
      ops_i32[i++] = value$
      ops_i32[i++] = scalar$
      ops_i32[i++] = audio$
    },
    SetProperty(gen$: i32, prop$: i32, kind: i32, value$: i32): void {
      DEBUG && console.log('SetProperty', gen$, prop$, kind, value$)
      ops_u32[i++] = Op.SetProperty
      ops_i32[i++] = gen$
      ops_i32[i++] = prop$
      ops_i32[i++] = kind
      ops_i32[i++] = value$
    },
    UpdateGen(gen$: i32): void {
      DEBUG && console.log('UpdateGen', gen$)
      ops_u32[i++] = Op.UpdateGen
      ops_i32[i++] = gen$
    },
    ProcessAudio(gen$: i32, audio$: i32): void {
      DEBUG && console.log('ProcessAudio', gen$, audio$)
      ops_u32[i++] = Op.ProcessAudio
      ops_i32[i++] = gen$
      ops_i32[i++] = audio$
    },
    ProcessAudioStereo(gen$: i32, audio_0$: i32, audio_1$: i32): void {
      DEBUG && console.log('ProcessAudioStereo', gen$, audio_0$, audio_1$)
      ops_u32[i++] = Op.ProcessAudioStereo
      ops_i32[i++] = gen$
      ops_i32[i++] = audio_0$
      ops_i32[i++] = audio_1$
    },
    BinaryOp(op: usize, lhs$: i32, rhs$: i32, out$: i32): void {
      DEBUG && console.log('BinaryOp', op, lhs$, rhs$, out$)
      ops_u32[i++] = Op.BinaryOp
      ops_u32[i++] = op
      ops_i32[i++] = lhs$
      ops_i32[i++] = rhs$
      ops_i32[i++] = out$
    }
  }
}
