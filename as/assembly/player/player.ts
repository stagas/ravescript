import { MAX_TRACKS } from '../dsp/constants'
import { add_audio_audio } from '../dsp/graph/math'
import { Out, PlayerTrack } from '../dsp/shared'
import { Sound } from '../dsp/vm/sound'

export class Player {
  constructor() { }
  tracks: StaticArray<PlayerTrack | null> = new StaticArray<PlayerTrack | null>(MAX_TRACKS)
  out: Out = new Out()
  process(begin: u32, end: u32): void {
    let sound: Sound
    let track: PlayerTrack | null
    for (let i = 0; i < this.tracks.length; i++) {
      track = this.tracks[i]
      if (track === null) break
      sound = changetype<Sound>(track.sound$)
      sound.fill(
        track.ops$,
        track.audio_LR$,
        begin,
        end,
        track.out$,
      )
      // console.log(`${f32.load(track.ops$ + 16)}`)
      add_audio_audio(
        track.out$,
        this.out.L$,
        begin,
        end,
        this.out.L$
      )
      memory.copy(
        this.out.R$ + (begin << 2),
        this.out.L$ + (begin << 2),
        (end - begin) << 2
      )
    }
  }
}
