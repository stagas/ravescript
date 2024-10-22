import { run as dspRun } from '../../../../generated/assembly/dsp-runner'
import { BUFFER_SIZE, MAX_AUDIOS, MAX_FLOATS, MAX_LISTS, MAX_LITERALS, MAX_SCALARS, MAX_VALUES } from '../constants'
import { Clock } from '../core/clock'
import { Engine } from '../core/engine'
import { Gen } from '../gen/gen'
import { Out, SoundValue, Track } from '../shared'
import { SoundValueKind } from './dsp-shared'

const enum Globals {
  sr,
  t,
  rt,
  co,
}

export function ntof(n: f32): f32 {
  return 440 * 2 ** ((n - 69) / 12)
}

// { n= 2 n 69 - 12 / ^ 440 * } ntof=
// export class SoundValue {
//   constructor(
//     public kind: SoundValueKind,
//     public ptr: i32,
//   ) { }
//   scalar$: i32 = 0
//   audio$: i32 = 0
// }

export class Sound {
  constructor(public engine: Engine) { }

  begin: u32 = 0
  end: u32 = 0
  pan: f32 = 0

  gens: Gen[] = []
  prevGens: Gen[] = []
  offsets: usize[][] = []

  audios: StaticArray<f32>[] = new Array<StaticArray<f32>>(MAX_AUDIOS).map(() => new StaticArray<f32>(BUFFER_SIZE))
  values: SoundValue[] = new Array<SoundValue>(MAX_VALUES).map((): SoundValue => {
    const value: SoundValue = new SoundValue()
    value.kind = SoundValueKind.Null
    return value
  })

  floats: StaticArray<i32> = new StaticArray<i32>(MAX_FLOATS)
  lists: StaticArray<i32> = new StaticArray<i32>(MAX_LISTS)
  literals: StaticArray<f32> = new StaticArray<f32>(MAX_LITERALS)
  scalars: StaticArray<f32> = new StaticArray<f32>(MAX_SCALARS)

  @inline
  reset(): void {
    this.gens.forEach(gen => {
      gen._reset()
    })
    this.literals.fill(0)
    this.scalars.fill(0)
  }

  @inline
  clear(): void {
    this.prevGens = this.gens
    this.gens = []
    this.offsets = []
    // this.values = []
    // this.audios = []
  }

  @inline
  updateScalars(c: Clock): void {
    this.scalars[Globals.t] = f32(c.barTime)
    this.scalars[Globals.rt] = f32(c.time)
  }

  @inline
  fillTrack(track$: usize, begin: u32, end: u32, out$: usize): void {
    const out = changetype<Out>(out$)
    const track = changetype<Track>(track$)
    const run_ops$ = track.run_ops$
    const audio_LR$ = track.audio_LR$

    const CHUNK_SIZE = 64
    let chunkCount = 0

    const c = this.engine.clock
    this.scalars[Globals.sr] = f32(c.sampleRate)
    this.scalars[Globals.co] = f32(c.coeff)

    let i = begin
    this.begin = i
    this.end = i
    dspRun(changetype<usize>(this), run_ops$)

    let time = c.time
    let barTime = c.barTime
    for (let x = i; x < end; x += BUFFER_SIZE) {
      const chunkEnd = x + BUFFER_SIZE > end ? end - x : BUFFER_SIZE

      for (let i: u32 = 0; i < chunkEnd; i += CHUNK_SIZE) {
        this.updateScalars(c)

        this.begin = x + i
        this.end = x + (i + CHUNK_SIZE > chunkEnd ? chunkEnd - i : i + CHUNK_SIZE)
        dspRun(changetype<usize>(this), run_ops$)

        chunkCount++

        c.time = time + f64(chunkCount * CHUNK_SIZE) * c.timeStep
        c.barTime = barTime + f64(chunkCount * CHUNK_SIZE) * c.barTimeStep
      }
      time = c.time
      barTime = c.barTime

      const audio = this.audios[audio_LR$]
      const p = x << 2
      memory.copy(
        out.L$ + p,
        changetype<usize>(audio) + p,
        chunkEnd << 2
      )
      // TODO: stereo
      // copy left to right for now
      memory.copy(
        out.R$ + p,
        out.L$ + p,
        chunkEnd << 2
      )
    }
  }

  @inline
  fill(ops$: usize, audio_LR$: i32, begin: u32, end: u32, out$: usize): void {
    const CHUNK_SIZE = 64
    let chunkCount = 0

    const c = this.engine.clock
    this.scalars[Globals.sr] = f32(c.sampleRate)
    this.scalars[Globals.co] = f32(c.coeff)

    let i = begin
    this.begin = i
    this.end = i
    dspRun(changetype<usize>(this), ops$)

    let time = c.time
    let barTime = c.barTime
    for (let x = i; x < end; x += BUFFER_SIZE) {
      const chunkEnd = x + BUFFER_SIZE > end ? end - x : BUFFER_SIZE

      for (let i: u32 = 0; i < chunkEnd; i += CHUNK_SIZE) {
        this.updateScalars(c)

        this.begin = x + i
        this.end = x + (i + CHUNK_SIZE > chunkEnd ? chunkEnd - i : i + CHUNK_SIZE)
        dspRun(changetype<usize>(this), ops$)

        chunkCount++

        c.time = time + f64(chunkCount * CHUNK_SIZE) * c.timeStep
        c.barTime = barTime + f64(chunkCount * CHUNK_SIZE) * c.barTimeStep
      }
      time = c.time
      barTime = c.barTime

      if (audio_LR$ < this.audios.length) {
        const audio = this.audios[audio_LR$]
        const p = (x << 2)
        memory.copy(
          out$ + p,
          changetype<usize>(audio) + p,
          chunkEnd << 2
        )
      }
    }
  }
}
