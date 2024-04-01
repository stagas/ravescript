// @ts-ignore
self.document = {
  querySelectorAll() { return [] as any },
  baseURI: location.origin
}

import wasmDsp from 'assembly-dsp'
import { Lru, rpc } from 'utils'
import { AstNode } from '../lang/interpreter.ts'
import { Token, tokenize } from '../lang/tokenize.ts'
import { Note } from '../util/notes-shared.ts'
import { Dsp, Sound } from './dsp'

export type DspWorker = typeof worker

const sounds = new Map<number, Sound>()

const getFloats = Lru(20, (key: string, length: number) => wasmDsp.alloc(Float32Array, length), item => item.fill(0), item => item.free())
const getNotes = Lru(20, (length: number) => wasmDsp.alloc(Float32Array, length), item => item.fill(0), item => item.free())

const worker = {
  dsp: null as null | Dsp,
  tokensAstNode: new Map<Token, AstNode>(),
  waveLength: 1,
  error: null as Error | null,
  async createDsp(sampleRate: number) {
    const dsp = this.dsp = Dsp({ sampleRate })
    return {
      memory: wasmDsp.memory,
      clock$: dsp.clock.ptr,
    }
  },
  async createSound() {
    const dsp = this.dsp
    if (!dsp) {
      throw new Error('Dsp not ready.')
    }
    const sound = dsp.Sound()
    sounds.set(+sound.sound$, sound)
    return +sound.sound$ as number
  },
  async renderSource(sound$: number, audioLength: number, code: string, voicesCount: number, hasMidiIn: boolean, notes: Note[]) {
    const dsp = this.dsp
    if (!dsp) {
      throw new Error('Dsp not ready.')
    }

    const sound = sounds.get(sound$)
    if (!sound) {
      throw new Error('Sound not found, id: ' + sound$)
    }

    const { clock } = dsp
    const info = this

    try {
      // ensure an audio in the stack
      code = code.trim() || '[zero]'

      const tokens = [...tokenize({ code })]

      sound.reset()

      clock.time = 0
      clock.barTime = 0
      clock.bpm ||= 144

      wasmDsp.updateClock(clock.ptr)

      const { program, out } = sound.process(tokens, voicesCount, hasMidiIn)

      if (!out.LR) {
        return { error: 'No audio in the stack.' }
      }

      info.tokensAstNode = program.value.tokensAstNode

      const length = Math.floor(audioLength * clock.sampleRate / clock.coeff)

      const key = `${sound$}:${length}`
      const floats = getFloats(key, length)
      const notesData = getNotes(notes.length * 4) // * 4 elements: n, time, length, vel

      let i = 0
      for (const note of notes) {
        const p = (i++) * 4
        notesData[p] = note.n
        notesData[p + 1] = note.time
        notesData[p + 2] = note.length
        notesData[p + 3] = note.vel
      }

      wasmDsp.fillSound(sound.sound$,
        sound.ops.ptr,
        notesData.ptr,
        notes.length,
        out.LR.getAudio(),
        0,
        floats.length,
        floats.ptr,
      )

      return { floats }
    }
    catch (e) {
      if (e instanceof Error) {
        console.warn(e)
        console.warn(...((e as any)?.cause?.nodes ?? []))
        info.error = e
        return { error: e.message }
      }
      throw e
    }
  },
}

const host = rpc<{ isReady(): void }>(self as any, worker)
host.isReady()
console.log('[dsp-worker] started')
