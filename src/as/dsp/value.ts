import { Sound, SoundContext } from 'dsp'
import { SoundValueKind } from '~/as/assembly/dsp/vm/dsp-shared.ts'
import { DspVm } from '~/generated/typescript/dsp-vm.ts'

type SoundPartial = { context: SoundContext, vm: DspVm }

export class Value<T extends Value.Kind = Value.Kind> {
  value$: number
  ptr: number = 0
  scalar$: number = 0
  audio$: number = 0
  context: Sound['context']
  constructor(sound: SoundPartial, kind: T extends Value.Kind.I32 | Value.Kind.Literal ? T : never, value: number)
  constructor(sound: SoundPartial, kind: T extends Value.Kind.Null | Value.Kind.Floats | Value.Kind.Scalar | Value.Kind.Audio | Value.Kind.Dynamic ? T : never)
  constructor(public sound: SoundPartial, public kind: Value.Kind, value?: number) {
    this.context = sound.context
    this.value$ = this.context.values++

    switch (kind) {
      case Value.Kind.Null:
        this.ptr = 0
        break
      case Value.Kind.I32:
        this.ptr = value!
        break
      case Value.Kind.Floats:
        this.ptr = this.context.floats++
        break
      case Value.Kind.Literal:
        this.ptr = this.context.literals++
        this.context.literalsf[this.ptr] = value!
        break
      case Value.Kind.Scalar:
        this.ptr = this.context.scalars++
        break
      case Value.Kind.Audio:
        this.ptr = this.context.audios++
        break
      case Value.Kind.Dynamic:
        this.scalar$ = this.context.scalars++
        this.audio$ = this.context.audios++
        break
    }

    if (kind === Value.Kind.Dynamic) {
      sound.vm.SetValueDynamic(this.value$, this.scalar$, this.audio$)
    }
    else {
      sound.vm.SetValue(this.value$, kind as number, this.ptr)
    }
  }
  getAudio() {
    if (this.kind === Value.Kind.Dynamic) {
      return this.audio$
    }
    else {
      return this.ptr
    }
  }
}

export namespace Value {
  export enum Kind {
    Null = SoundValueKind.Null,
    I32 = SoundValueKind.I32,
    Floats = SoundValueKind.Floats,
    Literal = SoundValueKind.Literal,
    Scalar = SoundValueKind.Scalar,
    Audio = SoundValueKind.Audio,
    Dynamic = SoundValueKind.Dynamic,
  }
  export type Null = Value<Kind.Null>
  export type I32 = Value<Kind.I32>
  export type Floats = Value<Kind.Floats>
  export type Literal = Value<Kind.Literal>
  export type Scalar = Value<Kind.Scalar>
  export type Audio = Value<Kind.Audio>
  export type Dynamic = Value<Kind.Dynamic>

  export function Factory(sound: SoundPartial) {
    const Null = {
      create() { return new Value(sound, Kind.Null) }
    }
    const I32 = {
      create(value: number) { return new Value(sound, Kind.I32, value) }
    }
    const Floats = {
      create() { return new Value(sound, Kind.Floats) }
    }
    const Literal = {
      create(value: number) { return new Value(sound, Kind.Literal, value) }
    }
    const Scalar = {
      create() { return new Value(sound, Kind.Scalar) }
    }
    const Audio = {
      create() { return new Value(sound, Kind.Audio) }
    }
    const Dynamic = {
      create() { return new Value(sound, Kind.Dynamic) }
    }
    function toScalar(x: Value<Kind.Audio>) {
      const scalar = Scalar.create()
      sound.vm.AudioToScalar(x.ptr, scalar.ptr)
      return scalar
    }
    return {
      Null,
      I32,
      Floats,
      Literal,
      Scalar,
      Audio,
      Dynamic,
      toScalar
    }
  }
}
