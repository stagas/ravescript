// @ts-ignore
self.document = {
  querySelectorAll() { return [] as any },
  baseURI: location.origin
}

import { assign, getMemoryView, rpc, type MemoryView } from 'utils'
import { BUFFER_SIZE } from '~/as/assembly/dsp/constants.ts'
import type { __AdaptedExports as WasmExports } from '~/as/build/dsp-nort.d.ts'
import { builds, getTokens, setupTracks } from '~/src/as/dsp/build.ts'
import { createDsp } from '~/src/as/dsp/dsp.ts'
import { Clock, type Track } from '~/src/as/dsp/shared.ts'
import { Value } from '~/src/as/dsp/value.ts'
import { wasm } from '~/src/as/dsp/wasm.ts'
import { AstNode } from '~/src/lang/interpreter.ts'
import { Token } from '~/src/lang/tokenize.ts'

export type PreviewWorker = typeof worker

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
  dsp: null as null | ReturnType<typeof createDsp>,
  view: null as null | MemoryView,
  out$: null as null | number,
  clock: null as null | Clock,
  tracks: null as null | Track[],
  track: null as null | Track,
  error: null as null | Error,
  async createDsp(sampleRate: number) {
    const dsp = this.dsp = createDsp(sampleRate, wasm as unknown as typeof WasmExports, wasm.memory)
    const view = this.view = getMemoryView(wasm.memory)
    wasm.__pin(dsp.sound$)
    wasm.__pin(dsp.player$)
    this.clock = Clock(wasm.memory.buffer, dsp.clock$)
    this.tracks = setupTracks(
      view,
      dsp.tracks$$,
      dsp.run_ops$$,
      dsp.setup_ops$$,
      dsp.literals$$,
      dsp.lists$$,
    )
    this.track = this.tracks[0]
    return {
      memory: wasm.memory,
      L: dsp.L,
      R: dsp.R,
      sound$: dsp.sound$,
      audios$$: dsp.audios$$,
      values$$: dsp.values$$,
      scalars: dsp.scalars,
    }
  },
  build(code: string) {
    const { dsp, track } = this
    if (!dsp || !track) throw new Error('Dsp not ready.')

    const { tokens } = getTokens(code.replaceAll('\n', '\r\n'))

    const buildTrack = builds.get(track)!

    const { program, out } = buildTrack(tokens)
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

    return {
      LR,
      waves: waveWidgets as WidgetInfo[],
      rmss: rmsWidgets as WidgetInfo[],
      lists: listWidgets as ListInfo[],
    }
  },
  async renderSource(code: string) {
    const { dsp, view, clock, track } = this
    if (!dsp || !view || !clock || !track) throw new Error('Dsp not ready.')

    const info = this

    try {
      wasm.resetSound(dsp.sound$)
      wasm.clearSound(dsp.sound$)

      clock.time = 0
      clock.barTime = 0
      clock.bpm ||= 144

      wasm.clockUpdate(clock.ptr)

      const { LR, waves, rmss, lists } = this.build(code)

      wasm.soundSetupTrack(dsp.sound$, track.ptr)

      wasm.fillTrack(
        dsp.sound$,
        track.ptr,
        0,
        BUFFER_SIZE,
        dsp.out$,
      )

      const floats = dsp.L
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
            cause: (e as any).cause ?? { nodes: [] }
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
