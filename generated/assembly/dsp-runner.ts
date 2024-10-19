// AssemblyScript VM Runner
// auto-generated from scripts
import { Op } from './dsp-op'
import { Dsp, DspBinaryOp } from '../../as/assembly/dsp/vm/dsp'
import { Sound } from '../../as/assembly/dsp/vm/sound'

const dsp = new Dsp()

export function run(sound$: usize, ops$: usize): void {
  const snd = changetype<Sound>(sound$)
  const ops = changetype<StaticArray<i32>>(ops$)

  let i: i32 = 0
  let op: i32 = 0

  while (unchecked(op = ops[i++])) {
    switch (op) {

      case Op.CreateGen:
        dsp.CreateGen(
          snd,
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.CreateAudios:
        dsp.CreateAudios(
          snd,
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.CreateValues:
        dsp.CreateValues(
          snd,
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.AudioToScalar:
        dsp.AudioToScalar(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.LiteralToAudio:
        dsp.LiteralToAudio(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.Pick:
        dsp.Pick(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.Pan:
        dsp.Pan(
          snd,
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.SetValue:
        dsp.SetValue(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.SetValueDynamic:
        dsp.SetValueDynamic(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.SetProperty:
        dsp.SetProperty(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.UpdateGen:
        dsp.UpdateGen(
          snd,
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.ProcessAudio:
        dsp.ProcessAudio(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.ProcessAudioStereo:
        dsp.ProcessAudioStereo(
          snd,
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

      case Op.BinaryOp:
        dsp.BinaryOp(
          snd,
          changetype<DspBinaryOp>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++])),
          changetype<i32>(unchecked(ops[i++]))
        )
        continue

    } // end switch
  } // end while
}
