import { Player } from '../player/player'
import { Clock } from './core/clock'
import { Core, Engine } from './core/engine'
import { Out, PlayerTrack } from './shared'
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

export function resetClock(clock$: usize): void {
  const clock = changetype<Clock>(clock$)
  clock.reset()
}

export function updateClock(clock$: usize): void {
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

export function createOut(): usize {
  return changetype<usize>(new Out())
}

export function createPlayer(): usize {
  return changetype<usize>(new Player())
}

export function getPlayerOut(player$: usize): usize {
  return changetype<usize>(changetype<Player>(player$).out)
}

export function getPlayerTracks(player$: usize): usize {
  return changetype<usize>(changetype<Player>(player$).tracks)
}

export function createPlayerTrack(): usize {
  return changetype<usize>(new PlayerTrack())
}

export function playerProcess(player$: usize, begin: u32, end: u32): void {
  const player = changetype<Player>(player$)
  player.process(begin, end)
}
