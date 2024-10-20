// @ts-ignore
self.document = {
  querySelectorAll() { return [] as any },
  baseURI: location.origin
}

import type { Value } from 'dsp'
import { Dsp, Sound, wasm } from 'dsp'
import { assign, Lru, rpc } from 'utils'
import { BUFFER_SIZE } from '~/as/assembly/dsp/constants.ts'
import { AstNode } from '~/src/lang/interpreter.ts'
import { Token, tokenize } from '~/src/lang/tokenize.ts'

export type PreviewWorker = typeof worker

const sounds = new Map<number, Sound>()

const getFloats = Lru(10, (_key: string, length: number) => wasm.alloc(Float32Array, length), item => item.fill(0), item => item.free())

let epoch = 0

interface WidgetInfoPartial {
  index: number
  floats: Float32Array | null
  bounds: Token.Bounds
}

type WidgetInfo = (WidgetInfoPartial & { floats: WidgetInfoPartial['floats'] & {} })

const waveWidgets: WidgetInfoPartial[] = []
const rmsWidgets: WidgetInfoPartial[] = []

const worker = {
  dsp: null as null | Dsp,
  error: null as null | Error,
  async createDsp(sampleRate: number) {
    this.dsp = Dsp({ sampleRate })
  },
  async createSound() {
    const dsp = this.dsp
    if (!dsp) throw new Error('Dsp not ready.')

    const sound = dsp.Sound()
    sounds.set(sound.sound$, sound)
    return sound.sound$
  },
  async build(sound$: number, code: string) {
    const dsp = this.dsp
    if (!dsp) throw new Error('Dsp not ready.')

    const sound = sounds.get(sound$)
    if (!sound) throw new Error('Sound not found, id: ' + sound$)

    const tokens = [...tokenize({ code })]
    const { program, out } = sound.process(tokens)
    if (!out.LR) throw new Error('No audio in the stack.', { cause: { nodes: [] } })

    program.value.results.sort(({ result: { bounds: a } }, { result: { bounds: b } }) =>
      a.line === b.line
        ? a.col - b.col
        : a.line - b.line
    )

    let last: AstNode | null = null
    const nodes = new Map<AstNode, WidgetInfoPartial>()

    let waveCount = 0
    let rmsCount = 0

    for (const node of program.value.results) {
      if ('genId' in node || 'op' in node) {
        const bounds = node.result.bounds

        if (last && last.bounds.line === bounds.line && last.bounds.right > bounds.col) {
          last.bounds.right = bounds.col - 1
          nodes.get(last)!.bounds.right = bounds.col - 1
        }

        let info: WidgetInfoPartial

        if ('genId' in node) {
          info = (waveWidgets[waveCount] ??= { index: -1, floats: null, bounds })
          waveCount++
        }
        else if ('op' in node) {
          info = (rmsWidgets[rmsCount] ??= { index: -1, floats: null, bounds })
          rmsCount++
        }
        else {
          throw new Error('unreachable')
        }

        info.index = (node.result.value as Value.Audio).getAudio()
        info.floats = sound.getAudio(info.index)
        assign(info.bounds, bounds)

        nodes.set(node.result, info)

        last = node.result
      }
    }

    let delta = waveWidgets.length - waveCount
    while (delta-- > 0) waveWidgets.pop()

    delta = rmsWidgets.length - rmsCount
    while (delta-- > 0) rmsWidgets.pop()

    const LR = out.LR.getAudio()

    const length = BUFFER_SIZE
    const key = `${sound$}:${length}:${epoch++}`
    const floats = getFloats(key, length)

    return {
      ops$: sound.ops.ptr,
      LR,
      floats,
      waves: waveWidgets as WidgetInfo[],
      rmss: rmsWidgets as WidgetInfo[],
    }
  },
  async renderSource(sound$: number, code: string) {
    const dsp = this.dsp
    if (!dsp) throw new Error('Dsp not ready.')

    const sound = sounds.get(sound$)
    if (!sound) throw new Error('Sound not found, id: ' + sound$)

    const { clock } = dsp
    const info = this

    try {
      sound.reset()

      clock.time = 0
      clock.barTime = 0
      clock.bpm ||= 144

      wasm.clockUpdate(clock.ptr)

      const { LR, floats, waves, rmss } = await this.build(sound$, code)

      wasm.fillSound(
        sound.sound$,
        sound.ops.ptr,
        LR,
        0,
        floats.length,
        floats.ptr,
      )

      return { LR, floats, waves, rmss }
    }
    catch (e) {
      if (e instanceof Error) {
        console.warn(e)
        console.warn(...((e as any)?.cause?.nodes ?? []))
        info.error = e
        return {
          error: {
            message: e.message,
            cause: /* (e as any).cause ??  */{ nodes: [] }
          }
        }
      }
      throw e
    }
  },
}

const host = rpc<{ isReady(): void }>(self as any, worker)
host.isReady()
console.debug('[preview-worker] started')
