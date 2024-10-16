import { run as dspRun } from '../../../../generated/assembly/dsp-runner'
import { Note, ParamValue } from '../../gfx/sketch-shared'
import { clamp } from '../../util'
import { BUFFER_SIZE, MAX_FLOATS, MAX_LISTS, MAX_LITERALS, MAX_SCALARS } from '../constants'
import { Clock } from '../core/clock'
import { Engine } from '../core/engine'
import { Gen } from '../gen/gen'
import { SoundData, SoundValueKind } from './dsp-shared'

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

  data: SoundData = new SoundData()

  get begin(): u32 {
    return this.data.begin
  }

  get end(): u32 {
    return this.data.end
  }

  set pan(v: f32) {
    this.data.pan = v
  }

  get pan(): f32 {
    return this.data.pan
  }

  gens: Gen[] = []
  offsets: usize[][] = []

  literals: StaticArray<f32> = new StaticArray<f32>(MAX_LITERALS)
  scalars: StaticArray<f32> = new StaticArray<f32>(MAX_SCALARS)
  audios: Array<StaticArray<f32> | null> = []
  lists: StaticArray<i32> = new StaticArray<i32>(MAX_LISTS)
  floats: StaticArray<i32> = new StaticArray<i32>(MAX_FLOATS)

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

  // TODO: this needs to be updated to handle
  // sustained notes which have to keep track
  // which nY scalar we're using, e.g
  //  n0 n1 n2 are pressed together,
  //  n0 n1 are released, n2 should be filled until it is released
  // we need release/note off time.
  @inline
  updateVoices(notes$: usize, count: i32, start: f32, end: f32): void {
    let y = 0
    for (let i = 0; i < count; i++) {
      const note = changetype<Note>(notes$ + ((i * 4) << 2))
      if (note.time >= start && note.time < end) {
        const voice = voices[y++]
        this.scalars[voice[Voice.n]] = note.n
        this.scalars[voice[Voice.f]] = ntof(note.n)
        this.scalars[voice[Voice.t]] = note.time
        this.scalars[voice[Voice.v]] = note.vel
        if (y === 6) return
      }
    }
  }

  @inline
  updateParams(params$: usize, count: i32, start: f32, end: f32): void {
    const params = changetype<StaticArray<usize>>(params$)
    let y = 0
    for (let i = 0; i < count; i++) {
      const ptr = unchecked(params[(i * 2)])
      const len = i32(unchecked(params[(i * 2) + 1]))

      let a: ParamValue | null = null
      let b: ParamValue | null = null
      for (let j = 0; j < len; j++) {
        const v = changetype<ParamValue>(ptr + ((j * 4) << 2))
        if (!a) a = v
        else a = b
        b = v
        if (v.time >= end) break
      }

      if (a) {
        const param = Params.p0 + y
        y++
        let amt = f32(1.0)
        if (b) {
          if (a.time === b.time) {
            amt = b.amt
          }
          else {
            const diff: f32 = Mathf.max(0, start - a.time)
            const width: f32 = b.time - a.time
            const alpha = Mathf.min(width, diff) / width
            amt = clamp(-1.0, 1.0, 0.0, a.amt + (b.amt - a.amt) * alpha)
            // logf2(start, amt)
          }
        }
        this.scalars[param] = amt
        // logf(6667)
      }
      // if (v.time >= start && v.time < end) {
      //   const param = params[y++]
      //   this.scalars[param[Param.t]] = v.time
      //   this.scalars[param[Param.l]] = v.length
      //   this.scalars[param[Param.s]] = v.slope
      //   this.scalars[param[Param.a]] = v.amt
      //   if (y === 6) return
      // }
    }
  }

  fill(
    ops$: usize,
    notes$: usize,
    notesCount: u32,
    params$: usize,
    paramsCount: u32,
    audio_LR$: i32,
    begin: u32,
    end: u32,
    out$: usize
  ): void {
    const CHUNK_SIZE = 64
    let chunkCount = 0

    const c = this.engine.clock
    this.scalars[Globals.sr] = f32(c.sampleRate)
    this.scalars[Globals.co] = f32(c.coeff)

    let timeStart: f32
    let timeEnd: f32

    this.updateScalars(c)
    timeStart = f32(c.barTime / NOTE_SCALE_X)
    timeEnd = f32(c.barTime + c.barTimeStep * f64(CHUNK_SIZE))
    this.updateVoices(notes$, notesCount, timeStart, timeEnd)
    this.updateParams(params$, paramsCount, timeStart, timeEnd)

    let i = begin
    const data = this.data
    data.begin = i
    data.end = i
    dspRun(this, ops$)

    for (let x = i; x < end; x += BUFFER_SIZE) {
      const chunkEnd = x + BUFFER_SIZE > end ? end - x : BUFFER_SIZE

      for (let i: u32 = 0; i < chunkEnd; i += CHUNK_SIZE) {
        this.updateScalars(c)
        timeStart = f32(c.barTime * NOTE_SCALE_X)
        timeEnd = f32((c.barTime + c.barTimeStep * f64(CHUNK_SIZE)) * NOTE_SCALE_X)
        this.updateVoices(notes$, notesCount, timeStart, timeEnd)
        this.updateParams(params$, paramsCount, timeStart, timeEnd)

        data.begin = i
        data.end = i + CHUNK_SIZE > chunkEnd ? chunkEnd - i : i + CHUNK_SIZE
        dspRun(this, ops$)

        chunkCount++

        c.time = f64(chunkCount * CHUNK_SIZE) * c.timeStep
        c.barTime = f64(chunkCount * CHUNK_SIZE) * c.barTimeStep
      }

      const audio = this.audios[audio_LR$]
      memory.copy(
        out$ + (x << 2),
        changetype<usize>(audio),
        chunkEnd << 2
      )
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
