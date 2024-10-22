import { MAX_LISTS, MAX_LITERALS, MAX_OPS } from './constants'
import { Clock } from './core/clock'
import { Core, Engine } from './core/engine'
import { Out, Track } from './shared'
import { Player } from './vm/player'
import { Sound } from './vm/sound'

export * from '../../../generated/assembly/dsp-factory'
export { run as dspRun } from '../../../generated/assembly/dsp-runner'
export * from '../alloc'

export function createCore(sampleRate: u32): Core {
  return new Core(sampleRate)
}

export function createEngine(sampleRate: u32, core: Core): usize {
  return changetype<usize>(new Engine(sampleRate, core))
}

export function getEngineClock(engine$: usize): usize {
  return changetype<usize>(changetype<Engine>(engine$).clock)
}

export function clockReset(clock$: usize): void {
  const clock = changetype<Clock>(clock$)
  clock.reset()
}

export function clockUpdate(clock$: usize): void {
  const clock = changetype<Clock>(clock$)
  clock.update()
}

export function createSound(engine$: usize): usize {
  return changetype<usize>(new Sound(changetype<Engine>(engine$)))
}

export function resetSound(sound$: usize): void {
  changetype<Sound>(sound$).reset()
}

export function clearSound(sound$: usize): void {
  changetype<Sound>(sound$).clear()
}

export function fillSound(
  sound$: usize,
  ops$: usize,
  audio_LR$: i32,
  begin: u32,
  end: u32,
  out$: usize
): void {
  const sound = changetype<Sound>(sound$)
  sound.fill(
    ops$,
    audio_LR$,
    begin,
    end,
    out$
  )
}

export function getSoundAudio(sound$: usize, index: i32): usize {
  return changetype<usize>(changetype<Sound>(sound$).audios[index])
}

export function getSoundValue(sound$: usize, index: i32): usize {
  return changetype<usize>(changetype<Sound>(sound$).values[index])
}

export function getSoundLiterals(sound$: usize): usize {
  return changetype<usize>(changetype<Sound>(sound$).literals)
}

export function setSoundLiterals(sound$: usize, literals$: usize): void {
  changetype<Sound>(sound$).literals = changetype<StaticArray<f32>>(literals$)
}

export function getSoundScalars(sound$: usize): usize {
  return changetype<usize>(changetype<Sound>(sound$).scalars)
}

export function getSoundLists(sound$: usize): usize {
  return changetype<usize>(changetype<Sound>(sound$).lists)
}

export function createPlayer(sound$: usize, out$: usize): usize {
  return changetype<usize>(new Player(sound$, out$))
}

export function getPlayerTrackOffset(): usize {
  return offsetof<Player>('track$')
}

export function setPlayerTrack(player$: usize, track$: usize): void {
  changetype<Player>(player$).track$ = track$
}

export function playerProcess(player$: usize, begin: u32, end: u32): void {
  const player = changetype<Player>(player$)
  player.process(begin, end)
}

export function createOut(): usize {
  return changetype<usize>(new Out())
}

export function createTrack(): usize {
  return changetype<usize>(new Track())
}

export function createOps(): usize {
  return changetype<usize>(new StaticArray<i32>(MAX_OPS))
}

export function createLiterals(): usize {
  return changetype<usize>(new StaticArray<f32>(MAX_LITERALS))
}

export function createLists(): usize {
  return changetype<usize>(new StaticArray<i32>(MAX_LISTS))
}
