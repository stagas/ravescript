import { getMemoryView } from 'utils'
import { BUFFER_SIZE, MAX_AUDIOS, MAX_SCALARS, MAX_TRACKS, MAX_VALUES } from '~/as/assembly/dsp/constants.ts'
import type { __AdaptedExports as WasmExports } from '~/as/build/dsp-nort.d.ts'
import { Out } from '~/src/as/dsp/shared.ts'

export function createDspWasm(sampleRate: number, wasm: typeof WasmExports, memory: WebAssembly.Memory) {
  const view = getMemoryView(memory)

  const core$ = wasm.createCore(sampleRate)
  const engine$ = wasm.createEngine(sampleRate, core$)
  const clock$ = wasm.getEngineClock(engine$)

  const sound$ = wasm.createSound(engine$)

  const out$ = wasm.createOut()
  const out = Out(memory.buffer, out$)
  const L$ = wasm.allocF32(BUFFER_SIZE)
  const R$ = wasm.allocF32(BUFFER_SIZE)
  out.L$ = L$
  out.R$ = R$
  const L = view.getF32(out.L$, BUFFER_SIZE)
  const R = view.getF32(out.R$, BUFFER_SIZE)

  const player$ = wasm.createPlayer(sound$, out$)
  const player_track$ = player$ + wasm.getPlayerTrackOffset()
  const player_audios$$ = Array.from({ length: MAX_AUDIOS }, (_, index) => wasm.getSoundAudio(sound$, index))
  const player_values$$ = Array.from({ length: MAX_VALUES }, (_, index) => wasm.getSoundValue(sound$, index))
  const player_scalars = view.getF32(wasm.getSoundScalars(sound$), MAX_SCALARS)
  const tracks$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createTrack())
  const run_ops$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createOps())
  const setup_ops$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createOps())
  const literals$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createLiterals())
  const lists$$ = Array.from({ length: MAX_TRACKS }, () => wasm.createLists())

  return {
    clock$,
    sound$,
    out$,
    L,
    R,
    player$,
    player_track$,
    player_audios$$,
    player_values$$,
    player_scalars,
    tracks$$,
    run_ops$$,
    setup_ops$$,
    literals$$,
    lists$$,
  }
}
