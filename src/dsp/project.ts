import { Signal } from 'signal-jsx'
import { services } from '../services.ts'
import { Note } from '../util/notes-shared.ts'
import { Track, TrackBox } from './track.ts'

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
  source_id: string
  time: number
  length: number
  pitch: number
  params: ParamData[]
}

export interface TrackData {
  sources: SourceData[]
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
  tracks: TrackData[]
  comments: CommentData[]
}

export type Project = ReturnType<typeof Project>

export function Project(data: ProjectData, isSaved: boolean = true) {
  using $ = Signal()

  const info = $({
    isSaved,
    isLoaded: false,
    data: $(data, {
      tracks: data.tracks.map(track => $(track, {
        sources: track.sources.map(source => $(source)),
        notes: track.notes.map(note => $(note)),
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
    const { bpm } = info.data
    $()
    services.audio.info.bpm = bpm || 144
  })

  $.fx(() => {
    const { bpm } = services.audio.info
    $()
    info.data.bpm = bpm
  })

  $.fx(() => {
    const { isLoaded } = $.of(info)
    if (!isLoaded) return

    const { tracks } = info.data
    const { audio } = $.of(services)
    const { dsp } = $.of(audio.dsp.info)

    $()

    const newTracks = []

    const prevTracks = info.tracks

    for (let y = 0; y < tracks.length; y++) {
      const track = tracks[y]

      const prevIndex = prevTracks.findIndex(t => t.data === track)
      if (prevIndex >= 0) {
        const [prev] = prevTracks.splice(prevIndex, 1)
        newTracks.push(prev)
        continue
      }

      const t = Track(audio.dsp, track, y)

      newTracks.push(t)

      for (const box of track.boxes) {
        const source = t.info.sources.find(s => s.id === box.source_id)!
        t.addBox(source, $(box))
      }
    }

    // we didn't find these tracks, so we're guessing they
    // were removed, so stop them and dispose them.
    if (prevTracks.length) {
      let prev: Track | undefined
      while (prev = prevTracks.pop()) {
        prev.destroy()
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

  function addNewTrack() {
    info.data.tracks = [
      ...info.data.tracks,
      $({
        sources: [{ code: '' }],
        boxes: [],
        notes: [],
      })
    ]
    $.flush()
  }

  function removeTrack(track: Track) {
    info.data.tracks = info.data.tracks.filter(t => t !== track.data)
    track.destroy()
    $.flush()
    for (const [y, t] of info.tracks.entries()) {
      t.info.y = y
    }
  }

  const project = { info, addNewTrack, removeTrack }

  return project
}
