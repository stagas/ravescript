import { logf, logf2, logf3, logf4, logf6, logi } from '../env'
import { Sketch } from './sketch'
import { Box, Line, Matrix, Notes, Shape, ShapeOpts, WAVE_MIPMAPS, Wave, Note, Params, ParamValue } from './sketch-shared'
import { lineIntersectsRect } from './util'

const MAX_ZOOM: f32 = 0.5
const BASE_SAMPLES: f32 = 48000
const NUM_SAMPLES: f32 = BASE_SAMPLES / MAX_ZOOM
const WAVE_MIPMAPS_THRESHOLD = 3000
const BLACK_KEYS = [1, 3, 6, 8, 10]

const enum WaveMode {
  Scaled,
  Normal,
}

export function draw(
  sketch$: usize,
  ptrs$: usize,
  matrix$: usize,
  width: f32,
  height: f32,
): void {
  const sketch = changetype<Sketch>(sketch$)

  const m = changetype<Matrix>(matrix$)
  const ma: f64 = m.a
  const md: f64 = m.d
  const me: f64 = m.e
  const mf: f64 = m.f

  // shapes
  let box: Box
  let line: Line
  let wave: Wave
  let notes: Notes
  let params: Params

  const x_gap: f32 = ma > 5 ? 1 : 0

  let px: f32 = 0
  let py: f32 = 0

  let ptrs = changetype<StaticArray<usize>>(ptrs$)
  let ptr: usize
  let i: i32 = 0
  while (unchecked(ptr = ptrs[i++])) {
    const opts = i32(changetype<Shape>(ptr).opts)

    switch (opts & 0b1111_1111) {
      //
      // Box
      //
      case ShapeOpts.Box: {
        box = changetype<Box>(ptr)

        const x = f32(box.x * ma + me)
        const y = f32(box.y * md + mf)
        const w = f32(box.w * ma - x_gap)
        let h = f32(box.h * md)
        if (
          !(opts & ShapeOpts.NoMargin)
          && (
            (!(opts & ShapeOpts.Collapse) || h > 1.5)
            && h > 1.5
          )
        ) {
          h -= h > 3 ? 1.0 : h > 1.5 ? .5 : 0
        }

        // check if visible
        if (x > width
          || y > height
          || x + w < 0
          || y + h < 0
        ) continue

        if (opts & ShapeOpts.Cols) {
          const SNAPS: f32 = 16
          const cols_n = i32(SNAPS - 1)
          for (let col = 0; col < cols_n; col++) {
            const col_x = f32(f32((box.w / SNAPS) * f32(col + 1) + box.x) * ma + me)
            const lw = f32(col % 16 === 15 ? 1.5 : col % 4 === 3 ? 1 : 0.5)
            sketch.drawLine(
              col_x, y,
              col_x, y + h,
              box.color, box.alpha, lw
            )
          }

        }
        else {
          sketch.drawBox(
            x, y, w, h,
            box.color, box.alpha
          )
        }

        continue
      }

      //
      // Notes
      //
      case ShapeOpts.Notes: {
        notes = changetype<Notes>(ptr)

        const x = f32(notes.x * ma + me)
        const y = f32(notes.y * md + mf)
        const w = f32(notes.w * ma - x_gap)
        let h = f32(notes.h * md)
        if (
          !(opts & ShapeOpts.NoMargin)
          && (
            (!(opts & ShapeOpts.Collapse) || h > 1.5)
            && h > 1.5
          )
        ) {
          h -= h > 3 ? 1.0 : h > 1.5 ? .5 : 0
        }

        // check if visible
        if (x > width
          || y > height
          || x + w < 0
          || y + h < 0
        ) continue

        const notesPtrs = changetype<StaticArray<usize>>(usize(notes.notes$))
        const isFocused = notes.isFocused
        const hoveringNote$ = usize(notes.hoveringNote$)
        let note: Note
        let note$: usize
        const min = notes.min
        const SCALE_X: f32 = 1.0 / 16.0
        const scale_N = notes.max - min

        if (isFocused) {
          for (let n = 0; f32(n) <= scale_N; n++) {
            const note = scale_N - (f32(n)) + min
            const note_key = note % 12
            const isBlack = BLACK_KEYS.includes(i32(note_key))
            if (!isBlack) continue

            let nh = h / (scale_N + 1)
            const ny = h - nh * ((f32(note) + 1) - min) // y
            nh -= nh > 3 ? 1.0 : nh > 1.5 ? .5 : 0

            sketch.drawBox(
              x,
              y + f32(ny) + 1.0,
              f32(w - x_gap),
              f32(nh),
              0x0, notes.alpha * 0.2
            )
          }
        }

        if (isFocused) {
          // draw shadows

          let i: i32 = 0
          while (note$ = unchecked(notesPtrs[i++])) {
            note = changetype<Note>(note$)

            const n = note.n
            const time = note.time
            const length = note.length
            const vel = note.vel

            const alpha: f32 = isFocused
              ? hoveringNote$ === note$
                ? 1
                : .45 + (.55 * vel)
              : .2 + (.8 * vel)

            const color: f32 = 0

            const nx = (time * SCALE_X) * ma
            if (nx >= w) continue

            let nh = h / (scale_N + 1)
            const ny = h - nh * ((n + 1) - min) // y
            let nw = (length * SCALE_X) * ma
            if (nx + nw > w) {
              nw = w - nx
            }
            nh -= nh > 3 ? 1.0 : nh > 1.5 ? .5 : 0
            nh += f32(.008 * md)
            sketch.drawBox(
              x + f32(nx),
              y + f32(ny) + 1.0,
              f32(nw - x_gap),
              f32(nh),
              color, notes.alpha * alpha
            )
          }
        }

        let i: i32 = 0
        while (note$ = unchecked(notesPtrs[i++])) {
          note = changetype<Note>(note$)

          const n = note.n
          const time = note.time
          const length = note.length
          const vel = note.vel

          const alpha: f32 = isFocused
            ? hoveringNote$ === note$
              ? 1
              : .45 + (.55 * vel)
            : .2 + (.8 * vel)

          const color = hoveringNote$ === note$
            ? notes.hoverColor
            : notes.color

          const nx = (time * SCALE_X) * ma
          if (nx >= w) continue

          let nh = h / (scale_N + 1)
          const ny = h - nh * ((n + 1) - min) // y
          let nw = (length * SCALE_X) * ma
          if (nx + nw > w) {
            nw = w - nx
          }
          nh -= nh > 3 ? 1.0 : nh > 1.5 ? .5 : 0
          sketch.drawBox(
            x + f32(nx),
            y + f32(ny) + 1.0,
            f32(nw - x_gap),
            f32(nh),
            color, notes.alpha * alpha
          )
        }

        continue
      }

      //
      // Line
      //
      case ShapeOpts.Line: {
        line = changetype<Line>(ptr)

        const hw = line.lw / 2.0
        const x0 = f32(line.x0 * ma + me - hw)
        let y0 = f32(line.y0 * md + mf - hw)
        const x1 = f32(line.x1 * ma + me - hw)
        let y1 = f32(line.y1 * md + mf - hw)

        if (opts & ShapeOpts.InfY) {
          y0 = 0
          y1 = height
        }

        // check if visible
        if (!lineIntersectsRect(x0, y0, x1, y1, 0, 0, width, height)) continue

        sketch.drawLine(
          x0, y0,
          x1, y1,
          line.color, line.alpha,
          line.lw,
        )

        continue
      }

      //
      // Params
      //
      case ShapeOpts.Params: {
        params = changetype<Params>(ptr)

        const x = f32(params.x * ma + me)
        const y = f32(params.y * md + mf)
        const w = f32(params.w * ma - x_gap)
        const h = f32(params.h * md - 1)

        // check if visible
        if (x > width
          || y > height
          || x + w < 0
          || y + h < 0
        ) continue

        const paramsPtrs = changetype<StaticArray<usize>>(usize(params.params$))
        let paramValue: ParamValue
        let paramValue$: usize

        let x0: f32 = 0
        let y0: f32 = 0
        let x1: f32 = 0
        let y1: f32 = 0

        let lastAmt: f32 = 0

        const hh: f32 = h / 2.0
        const hhs: f32 = hh * 0.65

        const HAS_SHADOW = opts & ShapeOpts.Shadow

        paramValue$ = unchecked(paramsPtrs[0])
        if (paramValue$) {
          paramValue = changetype<ParamValue>(paramValue$)

          const time = paramValue.time
          const length = paramValue.length
          const slope = paramValue.slope
          const amt = paramValue.amt

          x0 = 0
          x1 = x + f32(time * ma)
          y1 = y + amt * hhs + hhs
          y0 = y1

          if (HAS_SHADOW) sketch.drawLine(
            x0 + 1, y0 + 1,
            x1 + 1, y1 + 1,
            0x0, 1.0,
            1.0
          )

          sketch.drawLine(
            x0, y0,
            x1, y1,
            params.color, params.alpha,
            1.0
          )

          lastAmt = amt
        }

        let i: i32 = 0
        while (paramValue$ = unchecked(paramsPtrs[i++])) {
          paramValue = changetype<ParamValue>(paramValue$)

          const time = paramValue.time
          const length = paramValue.length
          const slope = paramValue.slope
          const amt = paramValue.amt

          x0 = x + f32(time * ma)
          y0 = y + lastAmt * hhs + hhs
          x1 = x + f32((time + length) * ma)
          y1 = y + amt * hhs + hhs

          if (HAS_SHADOW) sketch.drawLine(
            x0 + 1, y0 + 1,
            x1 + 1, y1 + 1,
            0x0, 1.0,
            1.0
          )
          sketch.drawLine(
            x0, y0,
            x1, y1,
            params.color, params.alpha,
            1.0
          )

          lastAmt = amt
        }

        if (HAS_SHADOW) sketch.drawLine(
          x1 + 1, y1 + 1,
          width + 1, y1 + 1,
          0x0, 1.0,
          1.0
        )
        sketch.drawLine(
          x1, y1,
          width, y1,
          params.color, params.alpha,
          1.0
        )

        continue
      }

      //
      // Wave
      //
      case ShapeOpts.Wave: {
        wave = changetype<Wave>(ptr)

        const x = f32(wave.x * ma + me)
        const y = f32(wave.y * md + mf)
        const w = f32(wave.w * ma - x_gap)
        const h = f32(wave.h * md - 1)

        // check if visible
        if (x > width
          || y > height
          || x + w < 0
          || y + h < 0
        ) continue

        //
        // sample coeff for zoom level
        //
        let sample_coeff: f64 = f64((NUM_SAMPLES / wave.coeff / 2.0) / ma)

        //
        // setup wave pointers
        //
        let p = i32(wave.floats$)
        let p_index: i32 = 0
        let n: f64 = 0
        let n_len = f64(wave.len)

        //
        // determine right edge
        //
        let right = x + w

        //
        // determine left edge (cx)
        //
        let cx: f64 = f64(x)
        let ox: f32 = 0
        // if left edge is offscreen
        if (cx < 0) {
          ox = -x
          cx = 0
        }

        //
        // determine width (cw)
        //
        let cw: f32 = w
        let ow: f32 = 0
        // if right edge if offscreen
        if (right > width) {
          // logf(444)
          ow = right - width
          cw = f32(width - cx)
          right = width
        }
        // or if left edge is offscreen
        else if (x < 0) {
          cw -= ox
        }

        let x_step: f64 = f64(ma / NUM_SAMPLES)
        let n_step: f64 = 1.0
        let mul: f64 = 1.0
        let lw: f32 = 1.1

        let waveMode: WaveMode = WaveMode.Scaled

        for (let i = 0; i < WAVE_MIPMAPS; i++) {
          const threshold = WAVE_MIPMAPS_THRESHOLD / (2 ** i)
          if (ma < threshold) {
            waveMode = WaveMode.Normal
            p_index += i32(Math.floor(n_len))
            n_len = Math.floor(n_len / 2.0)
            mul *= 2.0
            x_step *= 2.0
            lw = 1.1 - (0.8 * (1 -
              (f32(ma / WAVE_MIPMAPS_THRESHOLD) ** .35)
            ))
          }
          else {
            break
          }
        }

        n_step = sample_coeff / (mul / x_step)

        p += p_index << 2

        const hh: f32 = h / 2
        const yh = y + hh

        // advance the pointer if left edge is offscreen
        if (ox) {
          n += Math.floor(ox / x_step)
        }
        n = Math.floor(n)

        let nx = (n * n_step) % n_len

        switch (waveMode) {
          case WaveMode.Scaled: {
            let nfrac = nx - Math.floor(nx)

            let x0 = f32(cx)
            let y0 = yh + readSampleLerp(p, f32(nx), nfrac) * hh

            if (opts & ShapeOpts.Join) {
              sketch.drawLine(
                px, py,
                x0, y0,
                wave.color, wave.alpha,
                lw
              )
            }

            do {
              cx += x_step
              nx += n_step
              if (nx >= n_len) nx -= n_len

              nfrac = nx - Math.floor(nx)

              const x1 = f32(cx)
              const y1 = yh + readSampleLerp(p, f32(nx), nfrac) * hh

              sketch.drawLine(
                x0, y0,
                x1, y1,
                wave.color, wave.alpha,
                lw
              )

              x0 = x1
              y0 = y1
            } while (cx < right)

            px = x0
            py = y0

            break
          }

          case WaveMode.Normal: {
            let s = f32.load(p + (i32(nx) << 2))

            // move to v0
            let x0 = f32(cx)
            let y0 = yh + s * hh

            if (opts & ShapeOpts.Join) {
              sketch.drawLine(
                px, py,
                x0, y0,
                wave.color, wave.alpha,
                lw
              )
            }

            do {
              cx += x_step
              nx += n_step
              if (nx >= n_len) nx -= n_len

              const x1 = f32(cx)
              const y1 = yh + f32.load(p + (i32(nx) << 2)) * hh

              sketch.drawLine(
                x0, y0,
                x1, y1,
                wave.color, wave.alpha,
                lw
              )

              x0 = x1
              y0 = y1
            } while (cx < right)

            px = x0
            py = y0

            break
          }
        }

        continue
      }

      // default: {
      //   logf(66666)
      // }

    } // end switch
  } // end for
}

export function flushSketch(sketch$: usize): void {
  const sketch = changetype<Sketch>(sketch$)
  if (sketch.ptr) {
    sketch.flush()
  }
}

//
// helpers
//

// @ts-ignore
@inline
function readSampleLerp(p: i32, nx: f32, frac: f64): f32 {
  const s0 = f32.load(p + (i32(nx) << 2))
  const s1 = f32.load(p + (i32(nx + 1) << 2))
  return f32(f64(s0) + f64(s1 - s0) * frac)
}
