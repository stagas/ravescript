import { Player } from './player'
import { Out } from './shared'

export * from '../alloc'
export * from './math'
export * from './rand'

export function createPlayer(sampleRate: u32): Player {
  return new Player(sampleRate)
}

export function playerProcess(player$: usize, begin: u32, end: u32, out$: usize): void {
  const player = changetype<Player>(player$)
  player.process(begin, end, out$)
}

export function createOut(): usize {
  return changetype<usize>(new Out())
}
