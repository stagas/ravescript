import { BUFFER_SIZE, createDspNode, PreviewService, SoundValue } from 'dsp'
import type { Pane } from 'editor'
import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import type { Token } from 'lang'
import { Sigui } from 'sigui'
import { Canvas } from 'ui'
import { assign, dom, Lru, throttle } from 'utils'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
import { screen } from '~/src/screen.ts'
import { ListMarkWidget, RmsDecoWidget, WaveGlDecoWidget } from '~/src/ui/editor/widgets/index.ts'
import { copyRingInto } from '~/src/util/copy-ring-into.ts'

/*

t 4* x= [sin 100.00 409 [exp 1.00 x trig=] 31.88^ * + x trig=] [exp 1.00 x trig=] 6.26^ * [sno 83 .9] [dclipexp 1.088] [clip .40]
[saw (92 353 50 218) t 12* ? [sin 1 x trig=] 9^ 61* + x trig=] [clip .4] .7* [slp 156 22k [exp 8 x [sin .24 x trig] .15* + trig=] 4.7^ * +  .86] [exp 8 x trig=] .5^ * [sno 516 2181 [sin .2 co * t .5 - trig=] * + ] [delay 15 .73] .59*
[noi 4.23] [adsr .03 100 .3 48 x 3* on= x 3* .012 - off=] 2 [sin .3] 1.0 + .9^ * ^ [sin 2 x trig=] * * [shp 7090 .7] .21*
[noi 14.23] [adsr .03 10 .3 248 x 4* on= x 4* .012 - off=] 2 [sin .3] 1.0 + .9^ * ^ [sin 8 x trig=] * * [sbp 3790 .17 .60 [sin .5 co* t 2 / trig=]*+ ] .16*

t 4* x= [sin 100.00 409 [exp 1.00 x trig=] 31.88^ * + x trig=] [exp 1.00 x trig=] 6.26^ * [sno 83 .9] [dclipexp 1.088] [clip .40]
[saw (92 202 50 300) t 2* ? [sin 1 x trig=] 9^ 61* + x trig=] [clip .4] .7* [slp 156 22k [exp 8 x [sin .24 x trig] .15* + trig=] 4.7^ * +  .86] [exp 8 x trig=] .5^ * [sno 516 14400 [sin .2 co * t .5 - trig=] * + ] [delay 14 .73] .59*
[noi 4.23] [adsr .03 100 .3 48 x 3* on= x 3* .012 - off=] 2 [sin .3] 1.0 + .9^ * ^ [sin 2 x trig=] * * [shp 7090 .7] .21*
[noi 14.23] [adsr .03 10 .3 248 x 4* on= x 4* .012 - off=] 2 [sin .3] 1.0 + .9^ * ^ [sin 8 x trig=] * * [sbp 3790 .17 .60 [sin .5 co* t 2 / trig=]*+ ] .16*

t 8* y=
[saw (35 38 42 35) t 12* ? ntof] [slp 227 .8] 2* [tanh] [delay 16 .9] [slp 289 [exp 1 y trig=] 1^ 2290*+ .9] [exp 6 y trig=] .8^ * a= a .6* [delay 892 [sin 0.820] 38 * + .69]
[shp 466] a [shp 473] @ [atan] .8*

(1 2 3) t 8 * ?

t 8* y=
[saw (35 38 42 35) t 8* ? ntof] [slp 227 .8] 2* [tanh] [delay 16 .9] [slp 289 [exp 1 y trig=] 1^ 2290*+ .9] [exp .05 y 8 / trig=] 15.8^ * a= a .6* [delay 892 [sin 0.820] 38 * + .69]
[shp 466] a [shp 473] @ [atan] [blp 5555 .8] .8*

t 8* y=
[saw (35 38 42 35) t 1* ? ntof] [slp 227 .8] 2* [tanh] [delay 16 .9] [slp 289 [exp 1 y trig=] 1^ 2290*+ .9] [exp .05 y 8 / trig=] 15.8^ * a= a .6* [delay 892 [sin 0.820] 38 * + .69]
[shp 466] a [shp 473] @ [atan] [blp 5555 .8] .8*

[saw (4 5 0) t 1 * ? 40 + ntof]
[saw (8 12 4) t 1 * ? 40 + ntof] @ [slp 277] [shp 251] .14*
t 4* x= [sin 100.00 409 [exp 1.00 x] 31.88^ * + x] [exp 1.00 x] 6.26^ * [sno 83 .9] [dclipexp 1.088] [clip .40] 1*
[noi 4.23] [adsr .03 100 .3 48 x 3* on= x 3* .012 - off=] 2 [sin .3] 1.0 + .9^ * ^ [sin 2 x] * * [shp 7090 .7] .21*

t 4* y=
[saw (35 38 42 40) 8 t* ? ntof] [exp 8 y] [lp 4.40] .5^  * .27 * [slp 265 5171 [exp 1 y] [lp 66.60] 1.35^ * + .9]

t 4* y=
[saw (35 38 42 40) 4 [sin 1 co* t 4/]* ? ntof] [exp .25 y 8 /] [lp 9.15] .5^  * .27 * [slp 616 9453 [exp .4 y 4/ ] [lp 88.91] 1.35^ * + .9]

*/

const demo = `t 4* x= [sin 100.00 352 [exp 1.00 x] 31.88^ * + x] [exp 1.00 x] 6.26^ * [sno 83 .9] [dclipexp 1.088] [clip .40]
[saw (92 353 50 218 50 50 50 50) t 1* ? [sin 1 x] 9^ 61* + x] [clip .4] .7* [slp 156 22k [exp 8 x [sin .24 x] .15* +] 4.7^ * +  .86] [exp 8 x] .5^ * [sno 516 2181 [sin .2 co * t .5 -] * + ] [delay 15 .73] .59*
[noi 4.23] [adsr .03 100 .3 48 x 3* on= x 3* .012 - off=] 2 [sin .3] 1.0 + .9^ * ^ [sin 2 x] * * [shp 7090 .7] .21*
[noi 14.23] [adsr .03 10 .3 248 x 4* on= x 4* .012 - off=] 2 [sin .3] 1.0 + .9^ * ^ [sin 8 x] * * [sbp 3790 .17 .60 [sin .5 co* t 2 /]*+ ] .16*
`

const getFloatsGfx = Lru(1024, (key: string, length: number) => wasmGfx.alloc(Float32Array, length), item => item.fill(0), item => item.free())

let _dspEditorUi: ReturnType<typeof DspEditorUi>
export function dspEditorUi() {
  _dspEditorUi ??= DspEditorUi()
  return _dspEditorUi
}

export function DspEditorUi() {
  using $ = Sigui()

  const info = $({
    el: null as null | HTMLDivElement,
    resized: 0,
    get editorWidth() {
      info.resized
      return info.el?.clientWidth ? info.el.clientWidth * (screen.lg ? 0.5 : 1) : 100
    },
    get editorHeight() {
      info.resized
      return info.el?.clientHeight ? info.el.clientHeight * (screen.lg ? 1 : 0.7) : 100
    },
    get canvasWidth() {
      info.resized
      return info.el?.clientWidth ? info.el.clientWidth * (screen.lg ? 0.5 : 1) : 100
    },
    get canvasHeight() {
      info.resized
      return info.el?.clientHeight ? info.el.clientHeight * (screen.lg ? 1 : 0.3) : 100
    },
    code: demo,
    codeWorking: null as null | string,
    lastBuildPane: null as null | Pane,
    get didBuildPane() {
      const { pane } = dspEditor.editor.info
      return info.lastBuildPane === pane
    },
    audios: [] as Float32Array[],
    values: [] as SoundValue[],
    floats: new Float32Array(),
    previewSound$: null as null | number,
    previewAudios: [] as Float32Array[],
    previewValues: [] as SoundValue[],
    previewScalars: new Float32Array(),
    error: null as null | Error,
  })

  const ctx = new AudioContext({ sampleRate: 48000, latencyHint: 0.00001 })
  $.fx(() => () => ctx.close())

  const preview = PreviewService(ctx)
  $.fx(() => preview.dispose)

  const dspNode = createDspNode(ctx)
  $.fx(() => dspNode.dispose)

  $.fx(() => {
    const { codeWorking } = info
    $()
    dspNode.info.code = codeWorking
  })

  $.fx(() => {
    const { dsp, view } = $.of(dspNode.info)
    $()
    info.audios = dsp.audios$$.map(ptr => view.getF32(ptr, BUFFER_SIZE))
    info.values = dsp.values$$.map(ptr => SoundValue(view.memory.buffer, ptr))
  })

  $.fx(() => {
    const { audios, values } = $.of(info)
    const { isPlaying, clock, dsp: { scalars } } = $.of(dspNode.info)
    const { pane } = dspEditor.editor.info
    $()
    if (isPlaying) {
      const { wave: waveWidgets, rms: rmsWidgets, list: listWidgets } = getPaneWidgets(pane)
      let animFrame: any
      const tick = () => {
        for (const wave of [...waveWidgets, plot]) {
          copyRingInto(
            wave.info.stabilizerTemp,
            audios[wave.info.index],
            clock.ringPos,
            wave.info.stabilizerTemp.length,
            BUFFER_SIZE / 128 - 1
          )
          const startIndex = wave.info.stabilizer.findStartingPoint(wave.info.stabilizerTemp)
          wave.info.floats.set(wave.info.stabilizerTemp.subarray(startIndex))
          wave.info.floats.set(wave.info.stabilizerTemp.subarray(0, startIndex), startIndex)
        }

        for (const rms of rmsWidgets) {
          rms.update(values, audios, scalars)
        }

        for (const list of listWidgets) {
          list.update(values, audios, scalars)
        }

        pane.view.anim.info.epoch++
        animFrame = requestAnimationFrame(tick)
      }
      tick()
      return () => {
        for (const wave of [...waveWidgets, plot]) {
          wave.info.floats.set(wave.info.previewFloats)
        }
        pane.view.anim.info.epoch++
        cancelAnimationFrame(animFrame)
      }
    }
  })

  const canvas = <Canvas width={info.$.canvasWidth} height={info.$.canvasHeight} /> as HTMLCanvasElement
  const gfx = Gfx({ canvas })
  const view = Rect(0, 0, info.$.canvasWidth, info.$.canvasHeight)
  const matrix = Matrix()
  const c = gfx.createContext(view, matrix)
  const shapes = c.createShapes()
  c.sketch.scene.add(shapes)

  const widgetRect = Rect(0, 0, info.$.canvasWidth, info.$.canvasHeight)
  const plot = WaveGlDecoWidget(shapes, widgetRect)
  plot.info.stabilizerTemp = getFloatsGfx('s:LR', BUFFER_SIZE)
  plot.info.previewFloats = getFloatsGfx('p:LR', BUFFER_SIZE)
  plot.info.floats = getFloatsGfx(`LR`, BUFFER_SIZE)

  const paneWidgets = new Map<Pane, { wave: WaveGlDecoWidget[], rms: RmsDecoWidget[], list: ListMarkWidget[] }>()

  function getPaneWidgets(pane: Pane) {
    let widgets = paneWidgets.get(pane)
    if (!widgets) paneWidgets.set(pane, widgets = {
      wave: [],
      rms: [],
      list: [],
    })
    return widgets
  }

  $.fx(() => {
    const { isReady, dsp, view: previewView } = $.of(preview.info)
    $()
    info.previewSound$ = dsp.sound$
    info.previewAudios = dsp.audios$$.map(ptr => previewView.getF32(ptr, BUFFER_SIZE))
    info.previewValues = dsp.values$$.map(ptr => SoundValue(previewView.memory.buffer, ptr))
    info.previewScalars = dsp.scalars
  })

  async function build() {
    const { previewSound$, previewAudios, previewValues, previewScalars } = info
    if (!previewSound$) return

    const { pane } = dspEditor.editor.info
    const { code } = pane.buffer.info
    const { wave: waveWidgets, rms: rmsWidgets, list: listWidgets } = getPaneWidgets(pane)

    function fixBounds(bounds: Token.Bounds) {
      let newBounds = { ...bounds }
      {
        const { x, y } = pane.buffer.logicalPointToVisualPoint({ x: bounds.col, y: bounds.line })
        newBounds.line = y
        newBounds.col = x
      }
      {
        const { x, y } = pane.buffer.logicalPointToVisualPoint({ x: bounds.right, y: bounds.line })
        newBounds.right = x
      }
      return newBounds
    }

    let result: Awaited<ReturnType<PreviewService['service']['renderSource']>>
    let waveCount = 0
    let rmsCount = 0
    let listCount = 0

    try {
      result = await preview.service.renderSource(code)

      const { isPlaying } = dspNode.info

      pane.draw.widgets.deco.clear()
      plot.info.floats.fill(0)

      if (result.error) {
        throw new Error(result.error.message, { cause: result.error.cause })
      }

      $.batch(() => {
        info.error = null
        info.codeWorking = code
      })

      const end = $.batch()

      plot.info.index = result.LR
      const floats = previewAudios[plot.info.index]
      plot.info.previewFloats.set(floats)
      if (!isPlaying) plot.info.floats.set(floats)

      for (const waveInfo of result.waves) {
        const wave = (waveWidgets[waveCount] ??= WaveGlDecoWidget(pane.draw.shapes))

        wave.info.floats = wave.info.floats.length
          ? wave.info.floats
          : getFloatsGfx(`${waveCount}`, BUFFER_SIZE)

        wave.info.previewFloats = wave.info.previewFloats.length
          ? wave.info.previewFloats
          : getFloatsGfx(`p:${waveCount}`, BUFFER_SIZE)

        wave.info.stabilizerTemp = wave.info.stabilizerTemp.length
          ? wave.info.stabilizerTemp
          : getFloatsGfx(`s:${waveCount}`, BUFFER_SIZE)

        wave.info.index = previewValues[waveInfo.value$].ptr
        const audio = previewAudios[wave.info.index]
        wave.info.previewFloats.set(audio)
        if (!isPlaying) wave.info.floats.set(audio)

        assign(wave.widget.bounds, fixBounds(waveInfo.bounds))
        pane.draw.widgets.deco.add(wave.widget)
        waveCount++
      }

      for (const rmsInfo of result.rmss) {
        const rms = (rmsWidgets[rmsCount] ??= RmsDecoWidget(pane.draw.shapes))

        rms.info.index = previewValues[rmsInfo.value$].ptr
        rms.info.value$ = rmsInfo.value$
        if (!isPlaying) rms.update(previewValues, previewAudios, previewScalars)

        assign(rms.widget.bounds, fixBounds(rmsInfo.bounds))
        pane.draw.widgets.deco.add(rms.widget)
        rmsCount++
      }

      for (const listInfo of result.lists) {
        const list = (listWidgets[listCount] ??= ListMarkWidget(pane))

        list.info.list = listInfo.list.map(bounds => fixBounds(bounds))
        list.info.indexValue$ = listInfo.value$

        assign(list.widget.bounds, list.info.list[0])
        pane.draw.widgets.mark.add(list.widget)
        listCount++
      }

      end()
    }
    catch (err) {
      if (err instanceof Error) {
        info.error = err
      }
      else {
        throw err
      }
    }

    let delta = waveWidgets.length - waveCount
    while (delta-- > 0) waveWidgets.pop()?.dispose()

    delta = rmsWidgets.length - rmsCount
    while (delta-- > 0) rmsWidgets.pop()?.dispose()

    delta = listWidgets.length - listCount
    while (delta-- > 0) listWidgets.pop()?.dispose()

    pane.draw.info.triggerUpdateTokenDrawInfo++
    pane.view.anim.ticks.add(c.meshes.draw)
    pane.view.anim.info.epoch++
    pane.draw.widgets.update()
    requestAnimationFrame(() => {
      info.lastBuildPane = pane
    })
  }

  const buildThrottled = throttle(16, build)

  // queueMicrotask(() => {
  $.fx(() => {
    const { previewSound$ } = $.of(info)
    const { pane } = dspEditor.editor.info
    const { codeVisual } = pane.buffer.info
    const { isPlaying } = dspNode.info
    $()
    queueMicrotask(buildThrottled)
    // queueMicrotask(isPlaying ? buildThrottled : build)
  })
  // })

  const dspEditor = DspEditor({
    width: info.$.editorWidth,
    height: info.$.editorHeight,
    code: info.$.code,
  })

  $.fx(() => {
    const { error } = $.of(info)
    if (!error) return
    console.warn(error)
    dspEditor.info.error = error
    return () => dspEditor.info.error = null
  })

  info.el = <div class="flex flex-1">
    <div class="w-full h-[calc(100vh-87px)] pt-2">
      <div class="relative flex w-full h-full">
        {() => info.didBuildPane && <div class="absolute left-0 top-0 w-full h-full flex flex-col md:flex-row">
          {dspEditor}
          {canvas}
        </div>}
      </div>
    </div>
  </div> as HTMLDivElement

  dom.observe.resize(info.el, () => {
    requestAnimationFrame(() => {
      info.resized++
    })
  })

  return { el: info.el, info, dspEditor, dspNode }
}
