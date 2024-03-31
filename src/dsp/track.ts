import wasmGfx from 'assembly-gfx'
import wasmSeq from 'assembly-seq'
import { $, Signal } from 'signal-jsx'
import { Point, Rect } from 'std'
import { Lru, hueshift, luminate, saturate } from 'utils'
import { BUFFER_SIZE } from '../../as/assembly/dsp/constants.ts'
import { AstNode } from '../lang/interpreter.ts'
import { Token, tokenize } from '../lang/tokenize.ts'
import { screen } from '../screen.tsx'
import { services } from '../services.ts'
import { Source } from '../source.ts'
import { state } from '../state.ts'
import { Floats } from '../util/floats.ts'
import { Note } from '../util/notes-shared.ts'
import { createNote } from '../util/notes.ts'
import { hexToInt, intToHex, toHex } from '../util/rgb.ts'
import { DspService } from './dsp-service.ts'
import { BarBox, PlayerTrack } from './player-shared.ts'
import type { BoxData, Project, ProjectData, TrackData } from './project.ts'

const DEBUG = true

export const palette = [
  0xff5555,
  0x1188ff,
  0xbb55b0,
  0x44aa99,
  0xaaaa22,
]

export interface TrackBox {
  track: Track
  rect: $<Rect>
  info: $<{
    source: $<Source<Token>>
    barBox: BarBox
    isFocused: boolean
    isHovering: boolean
  }>
  data: $<BoxData>
}

const barBoxPool = Array.from({ length: 1024 }, () =>
  wasmSeq.createBarBox()
)

export function TrackBox(track: Track, source: $<Source<Token>>, data: $<BoxData>, rect?: $<Rect>): TrackBox {
  using $ = Signal()

  rect ??= $(new Rect(
    $(new Point, {
      x: data.$.length,
      y: 1,
    }),
    $(new Point, {
      x: data.$.time,
      y: track.info.$.y,
    })
  ))

  // $.fx(() => {
  //   const { time, length } = data
  //   const { y } = track.info
  //   $()
  //   rect!.x = time
  //   rect!.w = length
  //   rect!.y = y
  // })

  // $.fx(() => {
  //   const { x, w } = rect!
  //   $()
  //   data.time = x
  //   data.length = w
  // })

  const barBox$ = barBoxPool.pop()
  if (!barBox$) {
    throw new Error('Out of bar box elements.')
  }

  const barBox = BarBox(wasmSeq.memory.buffer, barBox$)
  $.fx(() => {
    const { time } = data
    $()
    barBox.timeBegin = time
  })
  $.fx(() => {
    const { pt } = track
    $()
    barBox.pt$ = pt.ptr
  })
  $.fx(() => () => {
    barBoxPool.push(barBox$)
  })

  const info = $({
    source,
    barBox,
    isFocused: false,
    isHovering: false,
  })

  const proto = { track }
  return { __proto__: proto, rect, info, data } as TrackBox & { __proto__: typeof proto }
}

export type Track = ReturnType<typeof Track>

export function Track(dsp: DspService, trackData: TrackData, y: number) {
  DEBUG && console.log('[track] create')

  using $ = Signal()

  const pt = PlayerTrack(wasmSeq.memory.buffer, wasmSeq.createPlayerTrack())
  const out_L = wasmSeq.alloc(Float32Array, BUFFER_SIZE)
  const out_R = wasmSeq.alloc(Float32Array, BUFFER_SIZE)
  const out_LR = wasmSeq.alloc(Float32Array, BUFFER_SIZE)
  pt.out_L$ = out_L.ptr
  pt.out_R$ = out_R.ptr
  pt.out_LR$ = out_LR.ptr

  const info = $({
    y,
    sound$: $.unwrap(() => dsp.ready.then(() => dsp.service.createSound())),
    get sources(): $<Source<Token>>[] {
      const { sources } = $.of(trackData)
      return sources.map(s => $(new Source<Token>(tokenize), {
        code: $(s).$.code!
      }))
    },
    get sy() {
      const { y } = this
      const { pr } = screen.info
      const { d, f } = state.viewMatrix
      $()
      return y * d * pr + f * pr
    },
    get audioLength() {
      let max = 0
      for (const { rect } of this.boxes) {
        if (rect.w > max) max = rect.w
      }
      return max
    },
    get width() {
      return this.right - this.left
    },
    get left() {
      return this.boxes.flat().reduce((p, n) =>
        n.rect.left < p
          ? n.rect.left
          : p,
        this.right
      )
    },
    get right() {
      return this.boxes.flat().reduce((p, n) =>
        n.rect.right > p
          ? n.rect.right
          : p,
        0
      )
    },
    waveLength: 1, // computed during effect update_audio_buffer
    get audioBuffer() {
      return services.audio.ctx.createBuffer(1, this.waveLength, services.audio.ctx.sampleRate)
    },
    tokensAstNode: new Map<Token, AstNode>(),
    boxes: [] as TrackBox[],
    error: null as Error | null,
    floats: null as Floats | null,
    notes: trackData.notes.map(note => createNote(
      note.n,
      note.time,
      note.length,
      note.vel,
    )),
    get notesJson() {
      const { notes } = this
      return notes.map(({ info: note }) => ({
        n: note.n,
        time: note.time,
        length: note.length,
        vel: note.vel,
      }))
    },
    get notesData() {
      const { notes } = this
      $()
      const data = wasmGfx.alloc(Uint32Array, notes.length + 1)
      for (let i = 0; i < notes.length; i++) {
        data[i] = notes[i].data.ptr
      }
      return data
    },
    get voicesCount() {
      const { notes } = this
      for (const note of notes) {
        const { n, time, length } = note.info
      }
      $()
      const times = new Map<number, Note[]>()
      let count = 0
      for (const { info: note } of notes) {
        let pressed = times.get(note.time)
        if (!pressed) times.set(note.time, pressed = [])
        pressed.push(note)
        count = Math.max(pressed.length, count)
      }
      return count
    },
    _color: -1,
    get color() {
      if (this._color < 0) {
        this._color = Math.floor(palette[this.y % palette.length])
      }
      return this._color
    },
    get colors() {
      const { y, color } = this
      const hexColor = intToHex(color)
      const hexColorBright = saturate(luminate(hexColor, .015), 0.1)
      const hexColorInvDark = luminate(saturate(hueshift(hexColor, 180), -1), -.45)
      const hexColorDark = luminate(saturate(hexColor, -.01), -.35)
      const hexColorBrighter = saturate(luminate(hexColor, .0030), 0.02)
      const hexColorBrightest = saturate(luminate(hexColor, .01), 0.02)
      const colorBright = hexToInt(hexColorBright)
      const colorBrighter = hexToInt(hexColorBrighter)
      const colorBrightest = hexToInt(hexColorBrightest)
      const colorDark = hexToInt(hexColorDark)

      const bg = hexToInt(luminate(toHex(screen.info.colors['base-100'] ?? '#333'), .05))
      const bg2 = hexToInt(luminate(toHex(screen.info.colors['base-100'] ?? '#333'), -.01))
      const bgHover = hexToInt(luminate(toHex(screen.info.colors['base-100'] ?? '#333'), -.01))
      const bgHover2 = hexToInt(luminate(toHex(screen.info.colors['base-100'] ?? '#333'), -.04))
      const fg = hexToInt(toHex(screen.info.colors['base-content'] ?? '#fff'))

      return {
        bg, //: y % 2 === 0 ? bg : bg2,
        bgHover, //: y % 2 === 0 ? bgHover : bgHover2,
        fg,
        color,
        hexColor,
        hexColorBright,
        hexColorBrighter,
        hexColorBrightest,
        hexColorDark,
        colorBright,
        colorBrighter,
        colorBrightest,
        colorDark,
      }
    },
  })

  const renderedEpoch = new Map<Source<Token>, number>()

  const getFloats = Lru(20, (length: number) => wasmSeq.alloc(Float32Array, length), item => item.fill(0), item => item.free())

  let isRendering = false
  let toRender = new Set<Source<Token>>()

  async function renderSource(source: Source<Token>) {
    if (isRendering) {
      toRender.add(source)
      return
    }

    const { code, epoch } = source
    if (code == null || epoch === renderedEpoch.get(source)) return

    const { sound$, audioLength } = info
    if (!sound$ || !audioLength) return

    const { voicesCount, notesJson } = info

    isRendering = true
    try {
      const { floats: dspFloats, error } = await dsp.service.renderSource(
        sound$,
        audioLength,
        code,
        voicesCount,
        source.tokens.some(t => t.text === 'midi_in'),
        notesJson,
      )

      if (error || !dspFloats) {
        throw new Error(error || 'renderSource failed.')
      }

      $.batch(() => {
        info.waveLength = dspFloats.length

        const floats = getFloats(dspFloats.length)
        floats.set(dspFloats)

        info.floats?.free()
        info.floats = Floats(floats)

        pt.len = floats.length
        pt.offset = 0
        pt.coeff = 1.0
        pt.pan = 0.0
        pt.vol = 1.0
        pt.floats_LR$ = floats.ptr
        // console.log(pt.len)

        info.audioBuffer.getChannelData(0).set(floats)

        renderedEpoch.set(source, epoch)
      })
    }
    finally {
      isRendering = false
      if (toRender.size) {
        const [first, ...rest] = toRender
        toRender = new Set(rest)
        renderSource(first).catch(console.warn)
      }
    }
  }

  // function equalSets(a: Set<any>, b?: Set<any> | null) {
  //   if (a.size !== b?.size) return false
  //   for (const item of a) {
  //     if (!b.has(item)) return false
  //   }
  //   for (const item of b) {
  //     if (!a.has(item)) return false
  //   }
  //   return true
  // }

  // $.fx(function update_sources() {
  //   const sources = new Set<Source<Token>>()
  //   for (const { info: { source } } of info.boxes) {
  //     sources.add(source)
  //   }
  //   $()
  //   if (!equalSets(sources, info.sources)) {
  //     info.sources = sources
  //   }
  // })

  $.fx(function update_audio_buffer() {
    const { sources } = $.of(info)
    $()
    {
      using $ = Signal()

      for (const source of sources) {
        $.fx(() => {
          const { voicesCount, notes } = info
          for (const note of notes) {
            const { n, time, length, vel } = note.info
          }
          $()
          source.epoch++
        })

        $.fx(() => {
          const { sound$, audioLength } = $.of(info)
          $()
          source.epoch++
        })

        $.fx(() => {
          const { sound$, audioLength } = $.of(info)
          const { epoch } = source
          $()
          const { voicesCount, notesJson } = info
          renderSource(source).catch(console.warn)
        })
      }

      return $.dispose
    }
  })

  function addBox(source: $<Source<Token>>, box: $<BoxData>) {
    const trackBox = TrackBox(track, source, box)
    track.info.boxes = [...track.info.boxes, trackBox]
  }

  function removeBox(trackBox: TrackBox) {
    track.info.boxes = [...track.info.boxes].filter(tb => tb !== trackBox)
  }

  const bufferSourcesPlaying = new Set<AudioBufferSourceNode>()

  function play() {
    const { audioBuffer } = info
    const bufferSource = services.audio.ctx.createBufferSource()
    bufferSource.buffer = audioBuffer
    bufferSource.connect(services.audio.ctx.destination)
    bufferSource.start()
    bufferSourcesPlaying.add(bufferSource)
    bufferSource.onended = () => {
      bufferSourcesPlaying.delete(bufferSource)
    }
  }

  function stop() {
    bufferSourcesPlaying.forEach(buf => buf.stop())
  }


  function destroy() {
    stop()
    $.dispose()
  }

  const track = { info, data: trackData, pt, addBox, removeBox, play, stop, destroy }
  return track
}
