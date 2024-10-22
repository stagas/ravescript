// @ts-ignore
self.document = {
  querySelectorAll() { return [] as any },
  baseURI: location.origin
}

import { Dsp, Sound, Value, wasm } from 'dsp'
import { assign, getMemoryView, Lru, rpc } from 'utils'
import { BUFFER_SIZE, MAX_AUDIOS, MAX_SCALARS, MAX_VALUES } from '~/as/assembly/dsp/constants.ts'
import { AstNode } from '~/src/lang/interpreter.ts'
import { Token, tokenize } from '~/src/lang/tokenize.ts'

export type PreviewWorker = typeof worker

const sounds = new Map<number, Sound>()

const getFloats = Lru(10, (_key: string, length: number) => wasm.alloc(Float32Array, length), item => item.fill(0), item => item.free())

let epoch = 0

interface WidgetInfo {
  value$: number
  bounds: Token.Bounds
}

interface ListInfo {
  list: Token.Bounds[]
  value$: number
  bounds: Token.Bounds
}

const waveWidgets: WidgetInfo[] = []
const rmsWidgets: WidgetInfo[] = []
const listWidgets: ListInfo[] = []

const worker = {
  dsp: null as null | Dsp,
  error: null as null | Error,
  async createDsp(sampleRate: number) {
    this.dsp = Dsp({ sampleRate })
    return {
      memory: wasm.memory,
    }
  },
  async createSound() {
    const dsp = this.dsp
    if (!dsp) throw new Error('Dsp not ready.')

    const sound = dsp.Sound()
    sounds.set(sound.sound$, sound)

    const audios$$ = Array.from({ length: MAX_AUDIOS }, (_, index) => wasm.getSoundAudio(sound.sound$, index))
    const values$$ = Array.from({ length: MAX_VALUES }, (_, index) => wasm.getSoundValue(sound.sound$, index))
    const scalars = getMemoryView(wasm.memory).getF32(wasm.getSoundScalars(sound.sound$), MAX_SCALARS)

    return { sound$: sound.sound$, audios$$, values$$, scalars }
  },
  async build(sound$: number, code: string) {
    const dsp = this.dsp
    if (!dsp) throw new Error('Dsp not ready.')

    const sound = sounds.get(sound$)
    if (!sound) throw new Error('Sound not found, id: ' + sound$)

    const tokens = Array.from(tokenize({ code: code.replaceAll('\n', '\r\n') }))

    const { program, out } = sound.process(tokens)
    if (!out.LR) throw new Error('No audio in the stack.', { cause: { nodes: [] } })

    program.value.results.sort(({ result: { bounds: a } }, { result: { bounds: b } }) =>
      a.line === b.line
        ? a.col - b.col
        : a.line - b.line
    )

    let last: AstNode | null = null
    const nodes = new Map<AstNode, WidgetInfo>()

    let waveCount = 0
    let rmsCount = 0
    let listCount = 0

    for (const node of program.value.results) {
      if (node.result.value instanceof Value && ('genId' in node || 'op' in node)) {
        const bounds = node.result.bounds

        // pre-post tokens are set to length -1 to be ignored
        if (bounds.length === -1) continue

        if (last && last.bounds.line === bounds.line && last.bounds.right > bounds.col) {
          last.bounds.right = bounds.col - 1
          nodes.get(last)!.bounds.right = bounds.col - 1
        }

        let info: WidgetInfo

        if ('genId' in node) {
          info = (waveWidgets[waveCount] ??= { value$: -1, bounds })
          waveCount++
        }
        else if ('op' in node) {
          if ('list' in node) {
            const info = (listWidgets[listCount] ??= { list: [], value$: -1, bounds })
            info.list = node.list.scope.stack.map(n => n.bounds)
            info.value$ = (node.index.value as Value.Dynamic).value$
            assign(info.bounds, bounds)
            listCount++
            continue
          }
          info = (rmsWidgets[rmsCount] ??= { value$: -1, bounds })
          rmsCount++
        }
        else {
          throw new Error('unreachable')
        }

        info.value$ = (node.result.value as Value.Dynamic).value$
        assign(info.bounds, bounds)

        nodes.set(node.result, info)

        last = node.result
      }
    }

    let delta = waveWidgets.length - waveCount
    while (delta-- > 0) waveWidgets.pop()

    delta = rmsWidgets.length - rmsCount
    while (delta-- > 0) rmsWidgets.pop()

    delta = listWidgets.length - listCount
    while (delta-- > 0) listWidgets.pop()

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
      lists: listWidgets as ListInfo[],
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

      const { LR, floats, waves, rmss, lists } = await this.build(sound$, code)

      wasm.fillSound(
        sound.sound$,
        sound.ops.ptr,
        LR,
        0,
        floats.length,
        floats.ptr,
      )

      return { LR, floats, waves, rmss, lists }
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
