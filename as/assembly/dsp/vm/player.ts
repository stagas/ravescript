import { run as dspRun } from '../../../../generated/assembly/dsp-runner'
import { Track } from '../shared'
import { Sound } from './sound'

export class Player {
  sound: Sound
  track$: usize = 0
  lastTrack$: usize = 0

  constructor(public sound$: usize, public out$: usize) {
    this.sound = changetype<Sound>(sound$)
  }

  process(begin: u32, end: u32): void {
    const sound = this.sound

    const track$ = this.track$

    if (track$ !== this.lastTrack$) {
      this.lastTrack$ = track$
      // sound.reset() // ??
      // ideally we should compare gens and move
      // the reused gens to the new context
      sound.clear()

      const track = changetype<Track>(track$)
      sound.literals = changetype<StaticArray<f32>>(track.literals$)
      sound.lists = changetype<StaticArray<i32>>(track.lists$)
      dspRun(this.sound$, track.setup_ops$)
    }
    // console.log(`${track$}`)
    sound.fillTrack(track$, begin, end, this.out$)
  }
}
