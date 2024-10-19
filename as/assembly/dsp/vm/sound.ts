import { run as dspRun } from '../../../../generated/assembly/dsp-runner'
import { BUFFER_SIZE, MAX_FLOATS, MAX_LISTS, MAX_LITERALS, MAX_SCALARS } from '../constants'
import { Clock } from '../core/clock'
import { Engine } from '../core/engine'
import { Gen } from '../gen/gen'
import { SoundValueKind } from './dsp-shared'

export function ntof(n: f32): f32 {
  return 440 * 2 ** ((n - 69) / 12)
}

export class SoundValue {
  constructor(
    public kind: SoundValueKind,
    public ptr: i32,
  ) { }
  scalar$: i32 = 0
  audio$: i32 = 0
}

export class Sound {
  constructor(public engine: Engine) { }

  begin: u32 = 0
  end: u32 = 0
  pan: f32 = 0

  gens: Gen[] = []
  offsets: usize[][] = []

  audios: Array<StaticArray<f32> | null> = []
  floats: StaticArray<i32> = new StaticArray<i32>(MAX_FLOATS)
  lists: StaticArray<i32> = new StaticArray<i32>(MAX_LISTS)
  literals: StaticArray<f32> = new StaticArray<f32>(MAX_LITERALS)
  scalars: StaticArray<f32> = new StaticArray<f32>(MAX_SCALARS)

  values: SoundValue[] = []

  reset(): void {
    this.gens.forEach(gen => {
      gen._reset()
    })
    this.literals.fill(0)
    this.scalars.fill(0)
  }

  clear(): void {
    this.gens = []
    this.offsets = []
    this.values = []
    this.audios = []
  }

  @inline
  updateScalars(c: Clock): void {
    this.scalars[Globals.t] = f32(c.barTime)
    this.scalars[Globals.rt] = f32(c.time)
  }

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

        this.begin = i
        this.end = i + CHUNK_SIZE > chunkEnd ? chunkEnd - i : i + CHUNK_SIZE
        dspRun(changetype<usize>(this), ops$)

        chunkCount++

        c.time = time + f64(chunkCount * CHUNK_SIZE) * c.timeStep
        c.barTime = barTime + f64(chunkCount * CHUNK_SIZE) * c.barTimeStep
      }
      time = c.time
      barTime = c.barTime

      if (audio_LR$ < this.audios.length) {
        const audio = this.audios[audio_LR$]
        memory.copy(
          out$ + (x << 2),
          changetype<usize>(audio) + (x << 2),
          chunkEnd << 2
        )
      }
    }
  }
}

const NOTE_SCALE_X: f64 = 16

const enum Globals {
  sr,
  t,
  rt,
  co,
}

const MAX_VOICES = 6

const enum Voices {
  n0 = 4,
  n1 = 8,
  n2 = 12,
  n3 = 16,
  n4 = 20,
  n5 = 24,
}

const enum Voice {
  n,
  f,
  t,
  v,
}

const voices: i32[][] = [
  [Voices.n0, Voices.n0 + 1, Voices.n0 + 2, Voices.n0 + 3],
  [Voices.n1, Voices.n1 + 1, Voices.n1 + 2, Voices.n1 + 3],
  [Voices.n2, Voices.n2 + 1, Voices.n2 + 2, Voices.n2 + 3],
  [Voices.n3, Voices.n3 + 1, Voices.n3 + 2, Voices.n3 + 3],
  [Voices.n4, Voices.n4 + 1, Voices.n4 + 2, Voices.n4 + 3],
  [Voices.n5, Voices.n5 + 1, Voices.n5 + 2, Voices.n5 + 3],
]

const MAX_PARAMS = 6

const enum Params {
  p0 = 28,
  p1,
  p2,
  p3,
  p4,
  p5,
}

const enum Param {
  t,
  l,
  s,
  a,
}

const params: i32[][] = [
  [Params.p0, Params.p0 + 1, Params.p0 + 2, Params.p0 + 3],
  [Params.p1, Params.p1 + 1, Params.p1 + 2, Params.p1 + 3],
  [Params.p2, Params.p2 + 1, Params.p2 + 2, Params.p2 + 3],
  [Params.p3, Params.p3 + 1, Params.p3 + 2, Params.p3 + 3],
  [Params.p4, Params.p4 + 1, Params.p4 + 2, Params.p4 + 3],
  [Params.p5, Params.p5 + 1, Params.p5 + 2, Params.p5 + 3],
]
