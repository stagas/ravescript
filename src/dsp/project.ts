import { $, Signal } from 'signal-jsx'
import { Token, tokenize } from '../lang/tokenize.ts'
import { services } from '../services.ts'
import { Source } from '../source.ts'
import { Track, TrackBox } from './track.ts'
import { Note } from '../util/notes-shared.ts'

interface SourceData {
  code?: string
}

interface ValueData {
  time: number
  length: number
  slope: number
  amt: number
}

interface ParamData {
  name: string
  values: ValueData[]
}

export interface BoxData {
  source_id: number
  time: number
  length: number
  pitch: number
  params: ParamData[]
}

export interface TrackData {
  notes: Note[]
  boxes: BoxData[]
}

interface CommentData {
  id: number
  time: number
  nick: string
  avatar: string
  message: string
  reply_to: number
}

export interface ProjectData {
  id: number
  timestamp: number
  title: string
  creator: string
  remix_of: number
  bpm: number
  pitch: number
  sources: SourceData[]
  tracks: TrackData[]
  comments: CommentData[]
}

export type Project = ReturnType<typeof Project>

export function Project(data: ProjectData, isSaved: boolean = true) {
  using $ = Signal()

  // TODO(Signal): $.deep({...})
  const info = $({
    isSaved,
    isLoaded: false,
    data: $(data, {
      sources: data.sources.map(source => $(source)),
      tracks: data.tracks.map(track => $(track, {
        boxes: track.boxes.map(box => $(box, {
          track,
          params: box.params.map(param => $(param, {
            values: param.values.map(value => $(value)),
          })),
        })),
      })),
      comments: data.comments.map(comment => $(comment)),
    }),
    tracks: [] as Track[],
    activeTrack: null as Track | null,
    activeTrackBox: null as TrackBox | null,
  })

  $.fx(() => {
    const { isLoaded } = info
    if (!isLoaded) return

    const { sources, tracks } = info.data
    const { audio } = $.of(services)
    const { dsp } = $.of(audio.dsp.info)

    $()

    const sourcesMap = new Map<number, $<Source<Token>>>()
    const newTracks = []

    for (let y = 0; y < tracks.length; y++) {
      const track = tracks[y]
      const t = Track(audio.dsp, track, y)

      newTracks.push(t)

      for (const box of track.boxes) {
        let source = sourcesMap.get(box.source_id)
        if (!source) sourcesMap.set(box.source_id,
          source = $(new Source<Token>(tokenize), {
            code: $(sources[box.source_id]).$.code!
          })
        )
        t.addBox(source, $(box))
      }
    }

    info.tracks = newTracks

    if (!info.activeTrack && info.tracks.length) {
      info.activeTrack = info.tracks[0]
      info.activeTrackBox = info.activeTrack.info.boxes[0]
    }
  })

  $.fx(() => {
    const { audio } = $.of(services)
    const { dsp } = $.of(audio.dsp.info)
    const { tracks } = info
    let endTime = -Infinity
    for (const t of tracks) {
      if (!t.info.width) continue
      endTime = Math.max(endTime, t.info.right)
    }
    if (!isFinite(endTime)) endTime = 0
    let startTime = endTime
    for (const t of tracks) {
      if (!t.info.width) continue
      startTime = Math.min(startTime, t.info.left)
    }
    $()
    const { clock: c } = audio.player
    const loopStart = Math.max(c.loopStart, startTime)
    const loopEnd = Math.min(c.loopEnd, endTime)
    c.loopStart = loopStart === startTime ? -Infinity : loopStart
    c.loopEnd = loopEnd === endTime ? +Infinity : loopEnd
    c.startTime = startTime
    c.endTime = endTime
    if (!audio.player.info.isPlaying) {
      audio.resetClock()
    }
  })

  const project = { info }

  return project
}
