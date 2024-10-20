import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import { Sigui } from 'sigui'
import { assign, Lru, throttle } from 'utils'
import { BUFFER_SIZE } from '~/as/assembly/dsp/constants.ts'
import { createDspNode } from '~/src/as/dsp/dsp-node.ts'
import { PreviewService } from '~/src/as/dsp/preview-service.ts'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
import { state } from '~/src/state.ts'
import { Button } from '~/src/ui/Button.tsx'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { WaveGlWidget } from '~/src/ui/editor/widgets/wave-gl.ts'
import { copyRingInto } from '~/src/util/copy-ring-into.ts'

const getFloatsGfx = Lru(1024, (key: string, length: number) => wasmGfx.alloc(Float32Array, length), item => item.fill(0), item => item.free())

export function DspNodeDemo() {
  using $ = Sigui()

  const info = $({
    get width() { return state.containerWidth / 2 },
    height: state.$.containerHeight,
    code: `t 4* x=
[sin 100.00 409
[exp 1.00 x trig=] 31.88^ * + x trig=]
[exp 1.00 x trig=] 6.26^ * [sno 83 .9] [dclipexp 1.088] [clip .40]
[saw 92 [sin 1] 9^ 61* + x trig=] [clip .4] .7* [slp 756 5000 [exp 8 x [sin .24 x trig] .15* + trig=] 4.7^ * +  .86] [exp 8 x trig=] .5^ * [lp 9999] [sno 1000] [delay 14 .65]
[noi 4.23] [adsr .03 100 .3 48 x 3* on= x 3* .012 - off=] 2
[sin .3] 1.0 + .9^ * ^
[sin 2 x trig=] * * [shp 7090 .7] .21*
`,
    codeWorking: null as null | string,
    audios: [] as Float32Array[],
    floats: new Float32Array(),
    sound$: null as null | number,
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
    info.audios = dsp?.player_audios$$.map(ptr => view.getF32(ptr, BUFFER_SIZE))
  })

  $.fx(() => {
    const { audios } = info
    const { isPlaying, clock } = $.of(dspNode.info)
    $()
    if (isPlaying) {
      const { pane } = dspEditor.editor.info
      let animFrame: any
      const tick = () => {
        for (const wave of [...waveWidgets, plot]) {
          copyRingInto(
            wave.info.stabilizerTemp,
            audios[wave.info.index + 1],
            clock.ringPos,
            wave.info.stabilizerTemp.length,
            15
          )
          const startIndex = wave.info.stabilizer.findStartingPoint(wave.info.stabilizerTemp)
          wave.info.floats.set(wave.info.stabilizerTemp.subarray(startIndex))
          wave.info.floats.set(wave.info.stabilizerTemp.subarray(0, startIndex), startIndex)
        }
        pane.view.anim.info.epoch++
        c.meshes.draw()
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

  const canvas = <Canvas width={info.$.width} height={info.$.height} /> as HTMLCanvasElement
  const gfx = Gfx({ canvas })
  const view = Rect(0, 0, info.$.width, info.$.height)
  const matrix = Matrix()
  const c = gfx.createContext(view, matrix)
  const shapes = c.createShapes()
  c.sketch.scene.add(shapes)

  const plot = WaveGlWidget(shapes)
  plot.widget.rect.w = view.width
  plot.widget.rect.h = view.height
  plot.info.stabilizerTemp = getFloatsGfx('s:LR', BUFFER_SIZE)
  plot.info.previewFloats = getFloatsGfx('p:LR', BUFFER_SIZE)
  plot.info.floats = getFloatsGfx(`LR`, BUFFER_SIZE)

  const waveWidgets: WaveGlWidget[] = []

  $.fx(() => {
    const { isReady } = $.of(preview.info)
    $().then(async () => {
      info.sound$ = await preview.service.createSound()
    })
  })

  async function build() {
    const { sound$ } = info
    if (!sound$) return

    const { pane } = dspEditor.editor.info
    const { codeVisual } = pane.buffer.info

    let result: Awaited<ReturnType<PreviewService['service']['renderSource']>>
    let nodeCount = 0

    try {
      result = await preview.service.renderSource(sound$, codeVisual)

      pane.draw.widgets.deco.clear()
      plot.info.floats.fill(0)

      if (result.error) {
        throw new Error(result.error.message, { cause: result.error.cause })
      }
      if (!result?.floats) {
        throw new Error('Could not render.')
      }

      info.error = null
      info.codeWorking = codeVisual
      plot.info.index = result.LR
      plot.info.previewFloats.set(result.floats)
      if (!dspNode.info.isPlaying) plot.info.floats.set(result.floats)

      for (const waveData of result.waves) {
        const wave = (waveWidgets[nodeCount] ??= WaveGlWidget(pane.draw.shapes))

        wave.info.floats = wave.info.floats.length
          ? wave.info.floats
          : getFloatsGfx(`${nodeCount}`, BUFFER_SIZE)

        wave.info.previewFloats = wave.info.previewFloats.length
          ? wave.info.previewFloats
          : getFloatsGfx(`p:${nodeCount}`, BUFFER_SIZE)

        wave.info.stabilizerTemp = wave.info.stabilizerTemp.length
          ? wave.info.stabilizerTemp
          : getFloatsGfx(`s:${nodeCount}`, BUFFER_SIZE)

        wave.info.index = waveData.index
        wave.info.previewFloats.set(waveData.floats)

        if (!dspNode.info.isPlaying) wave.info.floats.set(waveData.floats)

        assign(wave.widget.bounds, waveData.bounds)
        pane.draw.widgets.deco.add(wave.widget)
        nodeCount++
      }
    }
    catch (err) {
      if (err instanceof Error) {
        info.error = err
      }
      else {
        throw err
      }
    }

    let delta = waveWidgets.length - nodeCount
    while (delta-- > 0) waveWidgets.pop()?.dispose()

    pane.draw.info.triggerUpdateTokenDrawInfo++

    c.meshes.draw()
    pane.view.anim.info.epoch++
    pane.draw.widgets.update()
  }

  const buildThrottled = throttle(16, build)

  queueMicrotask(() => {
    $.fx(() => {
      const { sound$ } = $.of(info)
      const { pane } = dspEditor.editor.info
      const { codeVisual } = pane.buffer.info
      const { isPlaying } = dspNode.info
      $()
      queueMicrotask(isPlaying ? buildThrottled : build)
    })
  })

  const dspEditor = DspEditor({
    width: info.$.width,
    height: info.$.height,
    code: info.$.code,
  })

  $.fx(() => {
    const { error } = $.of(info)
    if (!error) return
    console.warn(error)
    dspEditor.info.error = error
    return () => dspEditor.info.error = null
  })

  return <div class="flex flex-row flex-nowrap">
    <Button class="fixed z-50 right-5" onpointerdown={() => {
      dspNode.info.isPlaying ? dspNode.stop() : dspNode.play()
    }}>{() => dspNode.info.isPlaying ? 'Stop' : 'Play'}</Button>
    {dspEditor}
    {canvas}
  </div>
}
