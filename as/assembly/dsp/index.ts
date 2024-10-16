import { Clock } from './core/clock'
import { Core, Engine } from './core/engine'
import { Sound } from './vm/sound'

export * from '../../../generated/assembly/dsp-factory'
export { run as dspRun } from '../../../generated/assembly/dsp-runner'
export * from '../alloc'

export function createCore(sampleRate: u32): Core {
  return new Core(sampleRate)
}

export function createEngine(sampleRate: u32, core: Core): Engine {
  return new Engine(sampleRate, core)
}

export function getEngineClock(engine: Engine): usize {
  return changetype<usize>(engine.clock)
}

export function resetClock(clock$: usize): void {
  const clock = changetype<Clock>(clock$)
  clock.reset()
}

export function updateClock(clock$: usize): void {
  const clock = changetype<Clock>(clock$)
  clock.update()
}

export function createSound(engine: Engine): Sound {
  return new Sound(engine)
}

export function resetSound(sound: Sound): void {
  sound.reset()
}

export function clearSound(sound: Sound): void {
  sound.clear()
}

export function fillSound(
  sound: Sound,
  ops$: usize,
  notes$: usize,
  notesCount: u32,
  params$: usize,
  paramsCount: u32,
  audio_LR$: usize,
  begin: u32,
  end: u32,
  out$: usize
): void {
  sound.fill(
    ops$,
    notes$,
    notesCount,
    params$,
    paramsCount,
    audio_LR$,
    begin,
    end,
    out$
  )
}

export function getSoundData(sound: Sound): usize {
  return changetype<usize>(sound.data)
}

export function getSoundAudio(sound: Sound, index: i32): usize {
  return changetype<usize>(sound.audios[index])
}

export function getSoundLiterals(sound: Sound): usize {
  return changetype<usize>(sound.literals)
}

export function setSoundLiterals(sound: Sound, literals$: usize): void {
  sound.literals = changetype<StaticArray<f32>>(literals$)
}

export function getSoundScalars(sound: Sound): usize {
  return changetype<usize>(sound.scalars)
}

export function getSoundLists(sound: Sound): usize {
  return changetype<usize>(sound.lists)
}
