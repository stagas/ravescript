import { Signal } from 'signal-jsx'
import { Matrix, Rect } from 'std'
import { MouseButtons, clamp, debounce, dom, fract } from 'utils'
import { ShapeOpts } from '../../as/assembly/gfx/sketch-shared.ts'
import { HEADS_WIDTH } from '../constants.ts'
import { Track, TrackBox } from '../dsp/track.ts'
import { Shapes } from '../gl/sketch.ts'
import { lib } from '../lib.ts'
import { screen } from '../screen.tsx'
import { services } from '../services.ts'
import { log, state } from '../state.ts'
import { Surface } from '../surface.ts'
import { transformMatrixRect } from '../util/geometry.ts'
import { BoxNote, MAX_NOTE, getNotesScale } from '../util/notes.ts'

const DEBUG = true
const SCALE_X = 1 / 16
const NOTES_HEIGHT_NORMAL = 0.65
const WAVES_HEIGHT_NORMAL = 1 - NOTES_HEIGHT_NORMAL
const WAVES_MARGIN_NORMAL = 0.0775
const OFFSCREEN_X = -100_000
const RESIZE_HANDLE_WIDTH = 7

const ZOOM_SPEED_SLOW = 0.2
const ZOOM_SPEED_NORMAL = 0.3

const CLICK_MS = 300
const OFFSET_X = 1

const SCALE_SPEED = 0.003
const MAX_ZOOM = 64000

export enum ZoomState {
  In,
  Out,
}

export type Grid = ReturnType<typeof Grid>

export function Grid(surface: Surface) {
  type GridBox = ReturnType<typeof GridBox>
  type GridNotes = ReturnType<typeof Notes>

  using $ = Signal()

  const { anim, mouse, keyboard, view, intentMatrix, viewMatrix, sketch } = surface
  const { targetMatrix } = state

  sketch.scene.clear()

  const info = $({
    redraw: 0,

    isDeletingBoxesTrack: null as null | Track,

    hoverBoxMode: 'select' as 'select' | 'resize' | 'move',
    hoveringBox: null as null | GridBox,
    resizingBox: null as null | GridBox,
    focusedBox: null as null | GridBox,
    drawingBox: null as null | GridBox,
    movingBox: null as null | GridBox,
    movingBoxOffsetX: 0,

    get isHandling() {
      return Boolean(
        this.resizingBox
        || this.drawingBox
        || this.movingBox
        || this.isDeletingBoxesTrack
        || this.draggingNote
      )
    },

    hoveringNoteN: -1,
    hoveringNote: null as null | BoxNote,
    draggingNote: null as null | BoxNote,

    boxes: null as null | ReturnType<typeof Boxes>,
    get rowsCount() {
      return this.boxes?.info.rows.length ?? 1
    },

    focusedParams: null as null | Uint32Array,
  })

  const max = MAX_ZOOM
  const limits = $({
    get x() {
      const min = !info.boxes ? view.w : view.w / Math.max(view.w, info.boxes.info.width)
      return { min, max }
    },
    get y() {
      const min = view.h / info.rowsCount
      return { min, max }
    },
  })
  const targetView = $(new Rect(view.size))
  const brushes = new Map<Track, GridBox>()
  const lastFocusedBoxes = new Map<Track, GridBox | null>()
  const gridInfo = info
  const r = { x: 0, y: 0, w: 0, h: 0 }
  const notePos = { x: -1, y: -1 }
  const mousePos = { x: 0, y: 0 }
  const snap = { x: true, y: true }
  const overlayMatrix = $(new Matrix, { d: intentMatrix.$.d })
  const overlay = Shapes(view, overlayMatrix)
  sketch.scene.add(overlay)

  let pianoroll: ReturnType<typeof Pianoroll> | undefined
  let isWheelHoriz = false
  let isZooming = false
  let lastHoveringBox: GridBox | null = null
  let brush: GridBox | null | undefined
  let orientChangeScore = 0
  let clicks = 0

  const rulerNow = overlay.Line(
    $({ x: 0, y: 0 }),
    $({ x: 0, get y() { return lib.project?.info.tracks.length ?? 0 } })
  )
  rulerNow.view.opts |= ShapeOpts.InfY

  function getInitialMatrixValues() {
    const boxes = info.boxes
    const left = boxes?.info.left || 0
    const width = boxes?.info.width || 1
    const height = lib.project!.info.tracks.length || 1
    const a = Math.max(7.27, targetView.w / width, 1)
    const d = targetView.h / height
    const e = OFFSET_X - left * a
    const f = 0
    return { a, d, e, f }
  }

  function fitHeight() {
    const { d } = getInitialMatrixValues()
    intentMatrix.d = d
  }

  function updateMousePos() {
    const { x, y } = mouse.screenPos
    mousePos.x = x
    mousePos.y = y
    $.flush()
  }

  function applyBoxMatrix(m: Matrix, box: GridBox) {
    Matrix.viewBox(m, targetView, box.rect)
  }

  function maybeScale(v: number, delta: number, limits: { min: number, max: number }) {
    let scale = (v + (delta * v ** 0.9)) / v
    const newScale = v * scale
    const clamped = clamp(limits.min, limits.max, newScale)
    if (clamped !== newScale) {
      scale = clamped / v
    }
    return scale
  }

  function handleWheelScaleY(ev: WheelEvent) {
    let { x, y } = mousePos

    const m = intentMatrix
    const { d } = m
    const delta = -ev.deltaY * SCALE_SPEED
    // if (lockedZoom.y && delta > 0) return

    const scale = maybeScale(d, delta, limits.y)
    if (scale === 1) return

    y = Math.max(0, y)
    m.translate(x, y)
    m.scale(1, scale)
    m.translate(-x, -y)
  }

  function handleWheelScaleX(ev: WheelEvent) {
    let { x, y } = mousePos

    const m = intentMatrix
    const { a } = m
    const delta = -ev.deltaY * SCALE_SPEED
    // if (lockedZoom.x && delta > 0) return

    const scale = maybeScale(a, delta, limits.x)
    if (scale === 1) return

    x = Math.max(0, x)
    m.translate(x, y)
    m.scale(scale, 1)
    m.translate(-x, -y)
  }

  function handleZoom(e: WheelEvent) {
    updateMousePos()
    // console.log(intentMatrix.a, intentMatrix.d)
    handleWheelScaleX(e)
    if (intentMatrix.a > 400 || intentMatrix.d > limits.y.min) {
      handleWheelScaleY(e)
    }
  }

  function unhoverBox() {
    if (info.draggingNote) return
    const { hoveringBox } = info
    if (hoveringBox) {
      info.hoveringBox = null
    }
  }

  function updateHoveringBox(box?: GridBox | null) {
    if (info.draggingNote) return

    if (box) {
      const { hoveringBox } = info
      // TODO: no need for rect check, only reference?
      // if (!hoveringBox || hoveringBox.rect.x !== box.rect.x || hoveringBox.rect.y !== box.rect.y) {
      info.hoveringBox = box
      // }
      if (brush) {
        // brush.rect.x = OFFSCREEN_X
        brush.hide()
        // brush = null
      }
    }
    else {
      unhoverBox()

      if (!lib.project) return
      if (info.isDeletingBoxesTrack) return

      let { x, y } = mouse.screenPos
      x = Math.floor(x)
      y = Math.floor(y)
      const track = lib.project.info.tracks[y]
      const lastBrush = brush
      brush = brushes.get(track)

      if (brush) {
        brush.show()
        brush.rect.x = x

        const boxAfter = track.info.boxes.sort((a, b) => a.data.time - b.data.time)
          .find(box => box !== brush!.trackBox && box.data.time > x)

        const lastW = lastFocusedBoxes.get(track)?.trackBox.rect.w ?? 1

        if (boxAfter) {
          brush.rect.w = Math.min(lastW, boxAfter.data.time - x)
        }
        else {
          brush.rect.w = lastW
        }
        info.hoveringBox = brush
      }

      if (lastBrush && lastBrush !== brush) {
        lastBrush.hide()
      }
    }
  }

  function handleHoveringBox(force?: boolean) {
    if (state.isHoveringHeads) return
    // if (state.isHoveringToolbar) return
    if (info.draggingNote) return
    if (!surface.info.isHovering) return
    if (info.movingBox) return
    if (info.resizingBox) return

    let { x, y } = mouse.screenPos
    x = Math.floor(x)
    y = Math.floor(y)

    if (!isZooming || force) {
      const box = info.boxes?.hitmap.get(`${x}:${y}`)

      out: {
        if (box) {
          if (info.isDeletingBoxesTrack) {
            if (info.isDeletingBoxesTrack === box.trackBox.track) {
              box.trackBox.track.removeBox(box.trackBox)
            }
            return
          }
          if (mouse.screenPos.x >= box.rect.right
            - (RESIZE_HANDLE_WIDTH / viewMatrix.a)
          ) {
            info.hoverBoxMode = 'resize'
            break out
          }
        }
        info.hoverBoxMode = 'select'
      }

      updateHoveringBox(box)
    }
  }

  function updateHoveringNoteN() {
    const { hoveringBox } = info
    if (!hoveringBox?.info.notes) {
      info.hoveringNoteN = -1
      return
    }

    let { x, y } = mouse.screenPos
    x -= hoveringBox.rect.x
    y = (y - hoveringBox.rect.y) * (1 / NOTES_HEIGHT_NORMAL)
    notePos.x = x * 16
    notePos.y = y

    const { notes } = hoveringBox.info
    if (!notes.info.scale) {
      info.hoveringNoteN = -1
      return
    }

    info.hoveringNoteN = clamp(
      0,
      MAX_NOTE - 1,
      Math.ceil(
        notes.info.scale.max
        - (y * (notes.info.scale.N + 1))
      )
    )
  }

  function handleHoveringNote() {
    if (!info.focusedBox) return
    if (info.hoveringBox !== info.focusedBox) {
      if (!info.hoveringBox || !info.draggingNote) {
        info.hoveringNoteN = -1
        info.hoveringNote = null
        return
      }
      if (info.hoveringBox?.trackBox.track === info.focusedBox.trackBox.track) {
        return
      }
    }
    // if (info.hoveringBox?.trackBox.kind !== TrackBoxKind.Notes) return
    if (info.draggingNote) return

    const { notes } = info.hoveringBox.trackBox.track.info

    updateHoveringNoteN()
    const hn = info.hoveringNoteN
    const { x, y } = notePos

    if (isZooming) {
      info.hoveringNote = null
      return
    }

    let found = false
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i]
      const { n, time, length } = note.info
      if (n !== hn) continue
      if (x >= time && x <= time + length) {
        info.hoveringNote = note
        found = true
        break
      }
    }
    if (!found) {
      info.hoveringNote = null
    }

    log('hover note', hn, x, y)
  }

  function handleDraggingNoteMove() {
    if (!info.draggingNote) return

    updateHoveringNoteN()
    info.draggingNote.info.n = info.hoveringNoteN
  }

  //
  // drawings
  //

  function toFront(shapes: Shapes) {
    sketch.scene.delete(shapes)
    sketch.scene.add(shapes)
  }

  function redraw(shapes?: Shapes) {
    shapes?.update()
    info.redraw++
  }

  function GridBox(boxes: Shapes, waveformShapes: Shapes, trackBox: TrackBox, dimmed: boolean = false) {
    using $ = Signal()

    const info = $({
      notes: null as null | GridNotes,
    })

    const { rect } = trackBox

    const box = boxes.Box(rect)
    const alpha = dimmed ? 0.25 : 1.0
    box.view.alpha = alpha

    // let waveformBg: ReturnType<Shapes['Wave']>
    let waveform: ReturnType<Shapes['Wave']>

    function hide() {
      box.visible = false
      if (info.notes) info.notes.notesShape.visible = false
      if (waveform) waveform.visible = false
    }

    function show() {
      box.visible = true
      if (info.notes) info.notes.notesShape.visible = true
      if (waveform) waveform.visible = true
    }

    function remove() {
      box.remove()
      if (info.notes) sketch.scene.delete(info.notes.shapes)
      // if (waveformBg) waveformBg.remove()
      if (waveform) waveform.remove()
      pianoroll?.hide()
      $.dispose()
    }

    if (!dimmed) $.fx(() => {
      const { track, info: { isFocused, isHovering } } = trackBox
      const color = isFocused || isHovering
        ? track.info.colors.colorBright
        : track.info.colors.color
      $()
      box.view.color = color
      redraw(boxes)
    })

    $.fx(() => {
      $()
      const notes = info.notes = Notes(trackBox, dimmed)
      sketch.scene.add(notes.shapes)
      redraw(notes.shapes)

      waveform = waveformShapes.Wave($({
        get x() { return rect.x },
        get y() { return rect.y + rect.h * NOTES_HEIGHT_NORMAL + rect.h * WAVES_MARGIN_NORMAL * 0.5 },
        get w() { return rect.w },
        get h() { return rect.h * WAVES_HEIGHT_NORMAL - rect.h * WAVES_MARGIN_NORMAL },
      }))
      waveform.view.alpha = alpha

      const off = $.fx(() => {
        const { isFocused } = trackBox.info
        $()
        if (isFocused && !dimmed) {
          pianoroll ??= Pianoroll(trackBox)
          pianoroll.info.trackBox = trackBox
          pianoroll.hide()
          pianoroll.show()
          toFront(notes.shapes)
          toFront(waveformShapes)
          redraw()
        }
      })

      return [() => {
        sketch.scene.delete(notes.shapes)
        off()
      }, $.fx(() => {
        const { track } = trackBox
        const { floats } = $.of(track.info)
        const { clock } = $.of(services.audio.dsp.info)
        $()

        waveform.view.color = 0x0
        waveform.view.floats$ = floats.ptr
        waveform.view.len = floats.len
        waveform.view.coeff = clock.coeff

        redraw(waveformShapes)
      })]

    })

    return { rect, trackBox, info, box, dimmed, remove, hide, show }
  }

  function Boxes(tracks: Track[]) {
    using $ = Signal()

    const hitmap = new Map<string, GridBox>()

    const shapes = Shapes(view, viewMatrix)
    const waveformShapes = Shapes(view, viewMatrix)

    $.fx(() => {
      sketch.scene.add(shapes)
      sketch.scene.add(waveformShapes)
      return () => {
        sketch.scene.delete(shapes)
        sketch.scene.delete(waveformShapes)
      }
    })

    const info = $({
      rows: [] as GridBox[][],
      params: null as null | ReturnType<typeof Params>,
      get width() {
        return this.right - this.left
      },
      get left() {
        return this.rows.flat().reduce((p, n) =>
          n.rect.left < p
            ? n.rect.left
            : p,
          this.right
        )
      },
      get right() {
        return this.rows.flat().reduce((p, n) =>
          n.rect.right > p
            ? n.rect.right
            : p,
          0
        )
      },
    })

    const gridBoxMap = new Map<TrackBox, GridBox>()

    $.fx(() => {
      const prevTrackBoxes = new Map<TrackBox, GridBox>(gridBoxMap)
      const currTrackBoxes = new Set<TrackBox>()

      info.rows = Array.from(tracks).map(track => {
        const gridBoxes: GridBox[] = []

        for (const box of track.info.boxes) {
          // const { length, time } = box.data
          let gridBox = gridBoxMap.get(box)
          if (!gridBox) gridBoxMap.set(
            box,
            gridBox = GridBox(shapes, waveformShapes, box)
          )
          currTrackBoxes.add(box)
          gridBoxes.push(gridBox)
        }

        if (!brushes.get(track)) $.untrack(() => {
          const templateBox = track.info.boxes[0] as TrackBox | undefined
          // if (!templateBox) return
          const brushBox = TrackBox(
            track,
            $(
              templateBox?.info.source
              ?? track.info.sources[0]
            ),
            $({
              ...templateBox?.data ?? ({
                source_id: track.info.sources[0].id,
                time: 0,
                length: 1,
                pitch: 0,
                params: [],
              })
            }),
            $(new Rect, {
              y: track.info.y,
              w: templateBox?.rect.w ?? 1,
              h: 1
            })
          )
          const gridBox = GridBox(shapes, waveformShapes, brushBox, true)
          gridBox.hide()
          brushes.set(track, gridBox)
        })

        const params = info.params = Params(track)
        sketch.scene.add(params.shapes)

        return gridBoxes
      })

      for (const [box, gridBox] of prevTrackBoxes) {
        if (!currTrackBoxes.has(box)) {
          gridBoxMap.delete(box)
          gridBox.remove()
        }
      }

      $()

      redraw(shapes)
    })

    $.fx(() => {
      const { rows } = info
      hitmap.clear()
      for (const row of rows) {
        for (const gridBox of row) {
          const { left, y, right } = gridBox.rect
          for (let x = left; x < right; x++) {
            hitmap.set(`${x}:${y}`, gridBox)
          }
        }
      }
    })

    function overlaps(y: number, time: number, length: number, ignoreGridBox?: GridBox) {
      const end = time + length
      for (let x = time; x < end; x++) {
        const box = hitmap.get(`${x}:${y}`)
        if (box && box !== ignoreGridBox) return true
      }
      return false
    }

    return { $, info, shapes, hitmap, overlaps }
  }

  function Pianoroll(trackBox: TrackBox) {
    using $ = Signal()

    const info = $({
      trackBox,
      scale: null as null | ReturnType<typeof getNotesScale>
    })

    $.fx(() => {
      const { draggingNote } = gridInfo
      if (draggingNote) return
      info.scale = getNotesScale(info.trackBox.track.info.notesJson)
    })

    const pianoroll = Shapes(view, viewMatrix)

    const cols = pianoroll.Box($({
      get x() { return info.trackBox.rect.x },
      get y() { return info.trackBox.rect.y },
      get w() { return info.trackBox.rect.w },
      get h() { return info.trackBox.rect.h },
    }))
    cols.view.opts |= ShapeOpts.Cols
    cols.view.alpha = 0.3

    function show() {
      sketch.scene.add(pianoroll)
    }

    function hide() {
      sketch.scene.delete(pianoroll)
    }

    return { info, show, hide }
  }

  function Notes(trackBox: TrackBox, dimmed: boolean = false) {
    using $ = Signal()

    const shapes = Shapes(view, viewMatrix)

    const info = $({
      update: 0,
      trackBox,
      scale: null as null | ReturnType<typeof getNotesScale>
    })

    $.fx(() => {
      const { draggingNote } = gridInfo
      if (draggingNote) return
      info.scale = getNotesScale(trackBox.track.info.notesJson)
    })

    const r = trackBox.rect

    const rect = $({
      get x() { return r.x },
      get y() { return r.y },
      get w() { return r.w },
      get h() { return r.h * NOTES_HEIGHT_NORMAL },
    })

    const notesShape = shapes.Notes(rect)
    notesShape.view.alpha = dimmed ? 0.5 : 1.0
    $.fx(() => {
      const { track, info: { isFocused } } = trackBox
      const { colors } = track.info
      const { primaryColorInt } = screen.info
      $()
      notesShape.view.color = 0x0 //isFocused && !dimmed ? colors.colorBright : colors.fg
      notesShape.view.hoverColor = primaryColorInt
    })

    $.fx(() => {
      const { scale } = $.of(info)
      const { notesData } = trackBox.track.info
      $()
      notesShape.view.notes$ = notesData.ptr
      notesShape.view.min = scale.min
      notesShape.view.max = scale.max
      redraw(shapes)
    })

    $.fx(() => {
      const { isFocused } = trackBox.info
      $()
      // notesShape.view.isFocused = Number(Boolean(isFocused))
      if (isFocused) {
        return $.fx(() => {
          const { hoveringNote } = gridInfo
          $()
          notesShape.view.hoveringNote$ = hoveringNote?.data.ptr ?? 0
          return () => {
            notesShape.view.hoveringNote$ = 0
          }
        })
      }
    })

    return { info, shapes, notesShape }
  }

  function Params(track: Track) {
    using $ = Signal()

    const shapes = Shapes(view, viewMatrix)

    const info = $({
      update: 0,
      track,
    })

    const rect = $({
      x: 1024,
      get y() { return track.info.y },
      get w() { return track.info.width },
      h: 1,
    })

    // paramsShape.view.alpha = 1.0 //dimmed ? 0.5 : 1.0
    // $.fx(() => {
    //   const { track, info: { isFocused } } = trackBox
    //   const { colors } = track.info
    //   const { primaryColorInt } = screen.info
    //   $()
    // })

    $.fx(() => {
      // const { track, info: { isFocused } } = trackBox
      // const { colors } = track.info
      const { primaryColorInt, secondaryColorInt } = screen.info
      const { paramsData } = track.info
      let { focusedParams } = grid.info
      $()
      shapes.clear()
      for (const params of paramsData) {
        if (!focusedParams && track.info.y === 3) {
          grid.info.focusedParams = params
        }

        const isFocused = focusedParams === params

        const paramsShape = shapes.Params(rect)

        if (isFocused) paramsShape.view.opts |= ShapeOpts.Shadow
        paramsShape.view.color = isFocused ? 0xffff00 : 0xffffff //0xffff00 //0x77eeff //secondaryColorInt
        paramsShape.view.alpha = isFocused ? 1.0 : 0.2
        // paramsShape.view.hoverColor = primaryColorInt
        paramsShape.view.params$ = params.ptr
      }
      redraw(shapes)
      // TODO: dispose?
    })

    // $.fx(() => {
    //   const { isFocused } = trackBox.info
    //   $()
    //   // notesShape.view.isFocused = Number(Boolean(isFocused))
    //   if (isFocused) {
    //     return $.fx(() => {
    //       const { hoveringNote } = gridInfo
    //       $()
    //       notesShape.view.hoveringNote$ = hoveringNote?.data.ptr ?? 0
    //       return () => {
    //         notesShape.view.hoveringNote$ = 0
    //       }
    //     })
    //   }
    // })

    return { info, shapes }
  }

  const zoomBox = $.fn(function zoomBox(box: GridBox) {
    isWheelHoriz = false
    state.zoomState = ZoomState.In
    viewMatrix.isRunning = true
    viewMatrix.speed = ZOOM_SPEED_SLOW
    applyBoxMatrix(intentMatrix, box)
  })

  const zoomFull = $.fn(function zoomFull() {
    isWheelHoriz = false
    state.zoomState = ZoomState.Out
    viewMatrix.isRunning = true
    viewMatrix.speed = ZOOM_SPEED_SLOW
    const m = getInitialMatrixValues()
    intentMatrix.a = m.a
    intentMatrix.d = m.d
    intentMatrix.e = m.e
    intentMatrix.f = m.f
  })

  const zoomFar = $.fn(function zoomFar() {
    if (!info.draggingNote) {
      info.hoveringNote = null
      info.focusedBox = null
    }
    viewMatrix.speed = ZOOM_SPEED_NORMAL
    state.zoomState = ZoomState.Out
  })

  const debounceClearClicks = debounce(CLICK_MS, () => {
    clicks = 0
  })

  mouse.targets.add(ev => {
    if (screen.info.overlay) return

    isZooming = false
    if (ev.type === 'mouseout' || ev.type === 'mouseleave') {
      unhoverBox()
      if (brush) {
        brush.hide()
        brush = null
      }
      return
    }
    else if (ev.type === 'mouseup') {
      if (info.isDeletingBoxesTrack) {
        info.isDeletingBoxesTrack = null
        $.flush()
        brush?.show()
      }
      if (info.drawingBox) {
        info.drawingBox = null
        return
      }
      if (info.resizingBox) {
        info.resizingBox = null
        return
      }
      if (info.movingBox) {
        info.movingBox = null
        info.hoverBoxMode = 'select'
        return
      }
    }
    else if (ev.type === 'mousedown') {
      updateMousePos()
      debounceClearClicks()
      if (info.hoveringBox) {
        if (ev.buttons & MouseButtons.Right) {
          info.isDeletingBoxesTrack = info.hoveringBox.trackBox.track
          brush?.hide()
          $.flush()
        }
        else {
          ++clicks
          if (info.hoveringBox?.dimmed) {
            info.hoveringBox.trackBox.track.addBox(
              info.hoveringBox.trackBox.info.source,
              $({
                ...info.hoveringBox.trackBox.data,
                time: info.hoveringBox.rect.x,
                length: info.hoveringBox.rect.w,
              }),
            )
            clicks = 0
            info.drawingBox = info.hoveringBox
            $.flush()
          }
          else if (clicks >= 2) {
            info.focusedBox = info.hoveringBox
            zoomBox(info.hoveringBox)
            return
          }
          else if (info.focusedBox === info.hoveringBox && info.hoveringNote) {
            info.draggingNote = info.hoveringNote
            dom.on(window, 'mouseup', $.fn((e: MouseEvent): void => {
              info.hoveringNoteN = -1
              info.hoveringNote = null
              info.draggingNote = null
              requestAnimationFrame(() => {
                updateMousePos()
                handleHoveringNote()
              })
            }), { once: true })
            return
          }
          else if (clicks === 1) {
            if (info.hoverBoxMode === 'resize') {
              info.focusedBox =
                info.resizingBox = info.hoveringBox
              return
            }
            else {
              if (fract(mouse.screenPos.y) >= NOTES_HEIGHT_NORMAL) {
                info.focusedBox = null
                info.hoverBoxMode = 'move'
                info.movingBox = info.hoveringBox
                lastFocusedBoxes.set(info.movingBox.trackBox.track, info.movingBox)
                info.movingBoxOffsetX = Math.floor(mouse.screenPos.x - info.movingBox.rect.x)
                return
              }
              else {
                info.focusedBox = info.hoveringBox
              }
            }
          }
        }
      }
      else {
        ++clicks
        if (clicks >= 2) {
          zoomFull()
        }
        else if (clicks === 1) {
          info.focusedBox = null
        }
      }
    }
    else if (ev.type === 'mousemove' || ev.type === 'mouseenter') {
      mouse.matrix = viewMatrix
      updateMousePos()
      if (!info.boxes) return

      if (info.draggingNote) {
        handleDraggingNoteMove()
        return
      }
      else if (info.drawingBox) {
        const { data, info: { source }, track, track: { info: { y } } } = info.drawingBox.trackBox
        const x = Math.floor(mouse.screenPos.x)
        if (!info.boxes.overlaps(y, x, data.length)) {
          track.addBox(
            source,
            $({
              ...data,
              time: x,
              length: data.length,
            }),
          )
          $.flush()
        }
        else {
          return
        }
      }
      else if (info.resizingBox) {
        const x = Math.round(mouse.screenPos.x)
        const w = Math.max(1, x - info.resizingBox.rect.x)
        info.resizingBox.trackBox.data.length = w
        const brush = brushes.get(info.resizingBox.trackBox.track)
        if (brush) brush.rect.w = w
        return
      }
      else if (info.movingBox) {
        const { data, track: { info: { y } } } = info.movingBox.trackBox
        const x = Math.floor(Math.floor(mouse.screenPos.x) - info.movingBoxOffsetX)
        if (!info.boxes.overlaps(y, x, data.length, info.movingBox)) {
          data.time = x
        }
        return
      }
    }
    else if (ev.type === 'wheel') {
      const e = ev as WheelEvent

      mouse.matrix = viewMatrix

      const isHoriz =
        Math.abs(e.deltaX) * (isWheelHoriz ? 3 : 3) >
        Math.abs(e.deltaY) * (isWheelHoriz ? .5 : 1)

      if (isHoriz !== isWheelHoriz) {
        if (orientChangeScore++ > (isWheelHoriz ? 3 : 2)) {
          orientChangeScore = 0
          updateMousePos()
          isWheelHoriz = isHoriz
        }
        else {
          return
        }
      }
      else {
        orientChangeScore = 0
      }

      if (isHoriz || e.altKey) {
        mouse.matrix = viewMatrix
        if (e.shiftKey) {
          const df = -(e.deltaX - (e.altKey ? e.deltaY : 0)) * 2.5 * 0.08 * (intentMatrix.d ** 0.18)
          snap.y = false
          intentMatrix.f -= df
        }
        else {
          const de = (e.deltaX - (e.altKey ? e.deltaY : 0)) * 2.5 * 0.08 * (intentMatrix.a ** 0.18)
          snap.x = false
          intentMatrix.e -= de
        }
      }
      else {
        if (e.ctrlKey || e.shiftKey) {
          intentMatrix.set(viewMatrix.dest)
          updateMousePos()
        }
        if (e.ctrlKey) {
          snap.x = false
          handleWheelScaleX(e)
        }
        if (e.shiftKey) {
          snap.y = false
          handleWheelScaleY(e)
        }
        if (!e.ctrlKey && !e.shiftKey) {
          snap.x = snap.y = true
          isZooming = true
          if (e.deltaY > 0) {
            intentMatrix.set(viewMatrix.dest)
          }
          handleZoom(e)
        }
      }
    }

    if (info.draggingNote) return

    handleHoveringBox()
    handleHoveringNote()
  })

  keyboard.targets.add(ev => {
    if (ev.type === 'keydown') {
      log(ev.key)
      if (ev.key === 'Escape') {
        if (info.focusedBox) {
          info.hoveringNote = null
          info.focusedBox = null
        }
        else {
          zoomFull()
        }
      }
    }
  })

  $.fx(function apply_wasm_matrix() {
    const { a, b, c, d, e, f } = intentMatrix
    $()
    const { isPlaying } = services.audio.player.info
    const m = viewMatrix.dest
    m.set(intentMatrix)

    if (isPlaying) {
      snap.x = false
    }

    if (info.hoveringBox) {
      lastHoveringBox = info.hoveringBox
    }
    if (lastHoveringBox) {
      const { rect } = lastHoveringBox
      if (snap.y && snap.x) {
        transformMatrixRect(m, rect, r)
        if (r.x < 0) {
          m.e -= r.x
        }
        transformMatrixRect(m, rect, r)
        if (r.x + r.w > view.w) {
          m.e -= r.x + r.w - view.w
          transformMatrixRect(m, rect, r)
          if (r.x < 0) {
            m.a = (view.w / rect.w)
            m.e = -rect.x * m.a
          }
        }
      }

      if (snap.y) {
        transformMatrixRect(m, rect, r)
        if (r.y < 0) {
          m.f -= r.y
        }
        transformMatrixRect(m, rect, r)
        if (r.y + r.h > view.h) {
          m.f -= r.y + r.h - view.h
          transformMatrixRect(m, rect, r)
          if (r.y < 0) {
            m.d = (view.h / rect.h)
            m.f = -rect.y * m.d
          }
        }
      }
    }

    if (Math.ceil(m.f + m.d * info.rowsCount) < view.h) {
      m.f = 0
      m.d = limits.y.min
      intentMatrix.d = m.d
      intentMatrix.f = m.f
    }
    if (m.d < limits.y.min) {
      m.d = limits.y.min
      intentMatrix.d = m.d
    }
    if (m.f > 0) {
      m.f = 0
      intentMatrix.f = m.f
    }

    // if (isPlaying) {
    //   viewMatrix.set(m)
    // }
  })

  $.fx(function update_zoom_speed() {
    const { isRunning } = viewMatrix
    $()
    if (!isRunning) {
      if (viewMatrix.speed === ZOOM_SPEED_SLOW) {
        viewMatrix.speed = ZOOM_SPEED_NORMAL
      }
    }
  })

  $.fx(function update_cursor() {
    const { hoveringBox, hoverBoxMode } = info
    $()
    if (hoveringBox) {
      if (hoverBoxMode === 'resize') {
        screen.info.cursor = 'ew-resize'
      }
      else if (hoverBoxMode === 'move') {
        screen.info.cursor = 'grabbing'
      }
      else {
        screen.info.cursor = 'default'
      }
    }
    else {
      screen.info.cursor = 'default'
    }
  })

  $.fx(function handleHoveringBox_on_viewMatrix() {
    const { a, b, c, d, e, f } = viewMatrix
    $()
    handleHoveringBox()
  })

  $.fx(function update_rulerNow_color() {
    rulerNow.view.color = screen.info.primaryColorInt
  })

  $.fx(function redraw_on_timeNow() {
    const { timeNow } = services.audio.info
    $()
    redraw(overlay)
  })

  $.fx(function autoscroll_on_playing() {
    const {
      info: { timeNow: x, timeNowLerp: xl },
      player: { info: { isPlaying } }
    } = services.audio

    const m = isPlaying ? intentMatrix : viewMatrix

    if (isPlaying) {
      const { a } = m
    }
    else {
      const { a, e } = m
    }

    $()
    overlayMatrix.a = 1
    overlayMatrix.e = 0

    const HALF = view.w / 2 - HEADS_WIDTH / 2

    rulerNow.p0.x =
      rulerNow.p1.x = HALF

    if (isPlaying) {
      intentMatrix.e = -x * m.a + HALF
      snap.x = false
    }
    else {
      rulerNow.p0.x =
        rulerNow.p1.x = isPlaying ? xl : x
      overlayMatrix.a = m.a
      overlayMatrix.e = m.e + 1
    }
  })

  $.fx(function redraw_on_isPlaying() {
    const { isPlaying } = services.audio.player.info
    $()
    surface?.anim.ticks.add(services.audio.tick)
    services.audio.tick()
    info.redraw++
  })

  $.fx(function clear_clicks_when_hovering_other() {
    const { hoveringBox } = info
    clicks = 0
  })

  $.fx(function update_hovering_box_color() {
    const { hoveringBox } = $.of(info)
    $()
    applyBoxMatrix(targetMatrix, hoveringBox)
    hoveringBox.box.view.color = hoveringBox.trackBox.track.info.colors.colorBright
    return () => {
      hoveringBox.box.view.color = hoveringBox.trackBox.track.info.colors.color
    }
  })

  $.fx(function update_box_isFocused() {
    const { project } = $.of(lib)
    const { focusedBox } = info
    if (!focusedBox) {
      $()
      pianoroll?.hide()
      redraw()
      return
    }
    const { trackBox } = focusedBox
    $()
    lastFocusedBoxes.set(trackBox.track, focusedBox)
    trackBox.info.isFocused = true
    project.info.activeTrack = trackBox.track
    project.info.activeTrackBox = trackBox
    return () => {
      trackBox.info.isFocused = false
    }
  })

  $.fx(function update_active_track_moving_box() {
    const { project } = $.of(lib)
    const { movingBox } = $.of(info)
    const { trackBox } = movingBox
    $()
    lastFocusedBoxes.set(trackBox.track, movingBox)
    project.info.activeTrack = trackBox.track
    project.info.activeTrackBox = trackBox
  })

  $.fx(function update_box_isHovering() {
    const { hoveringBox } = $.of(info)
    const { trackBox } = hoveringBox
    $()
    trackBox.info.isHovering = true
    return () => {
      trackBox.info.isHovering = false
    }
  })

  $.fx(function trigger_anim_on_redraw() {
    const { redraw } = $.of(info)
    $()
    toFront(overlay)
    anim.info.epoch++
  })

  const offInitialScale = $.fx(function apply_initial_scale() {
    const { project } = $.of(lib)
    const { boxes } = $.of(info)
    const { width } = boxes.info
    $()
    if (!width) return
    if (intentMatrix.a === 1) {
      const m = getInitialMatrixValues()
      viewMatrix.a = intentMatrix.a = m.a
      viewMatrix.d = intentMatrix.d = m.d
      viewMatrix.e = intentMatrix.e = m.e
    }
    queueMicrotask(() => offInitialScale())
  })

  $.fx(() => {
    const { project } = $.of(lib)
    const { tracks } = project.info
    $()
    brushes.clear()
    info.boxes = Boxes(tracks)
    fitHeight()
    return info.boxes.$.dispose
  })

  const grid = {
    info,
    view,
    snap,
    mouse,
    mousePos,
    intentMatrix,
    viewMatrix,
    handleZoom,
    handleWheelScaleX,
    updateHoveringBox,
    fitHeight,
  }

  return grid
}
