// AssemblyScript VM Runner
// auto-generated from scripts
import { Op } from './dsp-op'
import { Dsp, DspBinaryOp } from '../../as/assembly/dsp/vm/dsp'
import { Sound } from '../../as/assembly/dsp/vm/sound'

const dsp = new Dsp()

export function run(ctx: Sound, ops$: usize): void {
  const ops = changetype<StaticArray<i32>>(ops$)

  let i: i32 = 0
  let op: i32 = 0

  while (unchecked(op = ops[i++])) {
    switch (op) {

      case Op.CreateGen:
        dsp.CreateGen(
          ctx,
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.CreateAudios:
        dsp.CreateAudios(
          ctx,
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.CreateValues:
        dsp.CreateValues(
          ctx,
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.AudioToScalar:
        dsp.AudioToScalar(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.LiteralToAudio:
        dsp.LiteralToAudio(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.Pick:
        dsp.Pick(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.Pan:
        dsp.Pan(
          ctx,
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.SetValue:
        dsp.SetValue(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.SetValueDynamic:
        dsp.SetValueDynamic(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.SetProperty:
        dsp.SetProperty(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.UpdateGen:
        dsp.UpdateGen(
          ctx,
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.ProcessAudio:
        dsp.ProcessAudio(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.ProcessAudioStereo:
        dsp.ProcessAudioStereo(
          ctx,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
      case Op.BinaryOp:
        dsp.BinaryOp(
          ctx,
          changetype<DspBinaryOp>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
      continue
      
    } // end switch
  } // end while
}
