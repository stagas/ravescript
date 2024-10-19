import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import { Sigui } from 'sigui'
import { assign, Lru } from 'utils'
import { createDspNode } from '~/src/as/dsp/dsp-node.ts'
import { PreviewService } from '~/src/as/dsp/preview-service.ts'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
import { Button } from '~/src/ui/Button.tsx'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { WaveGlWidget } from '~/src/ui/editor/widgets/wave-gl.ts'
import { H3 } from '~/src/ui/Heading.tsx'

const getFloatsGfx = Lru(20, (key: string, length: number) => wasmGfx.alloc(Float32Array, length), item => item.fill(0), item => item.free())

export function DspNodeDemo() {
  using $ = Sigui()

  const info = $({
    width: 400,
    height: 300,
    code: `t 4* x=
[sin 67.51 413
[exp 1.00 x trig=] 65.78^ * + x trig=]
[exp 1.00 x trig=] 6.26^ * [sno 83 .9] [dclipexp 1.088] [clip .44]

[saw 42 x trig=] [clip .4] .55* [slp 523 1000 [exp 15 x trig=] 5.5^ * +  .99] [exp 8 x trig=] .2^ * [lp 2293]
[sno 8739]

[noi 6.66] [exp 6 x trig=] 2
[sin .2] 1.9 + .4^ * ^
[sin 2 x trig=] * * [sbp 7542 .9]
`,
    codeWorking: null as null | string,
    floats: new Float32Array(),
    sound$: null as null | number,
    error: null as null | Error,
  })

  const ctx = new AudioContext({ sampleRate: 48000 })
  $.fx(() => () => ctx.close())

  const preview = PreviewService(ctx)
  $.fx(() => preview.dispose)

  const dspNode = createDspNode(ctx)
  $.fx(() => dspNode.dispose)

  $.fx(() => {
    const { codeWorking } = info
    $()
    dspNode.info.code = codeWorking
    dspNode.play()
  })

  const length = 8192

  const canvas = <Canvas width={info.$.width} height={info.$.height} /> as HTMLCanvasElement
  const gfx = Gfx({ canvas })
  const view = Rect(0, 0, 500, 500)
  const matrix = Matrix()
  const c = gfx.createContext(view, matrix)
  const shapes = c.createShapes()
  c.sketch.scene.add(shapes)

  const plot = WaveGlWidget(shapes)
  plot.widget.rect.w = 400
  plot.widget.rect.h = 300
  plot.info.floats = wasmGfx.alloc(Float32Array, length)

  const waveWidgets: WaveGlWidget[] = []

  $.fx(() => {
    const { isReady } = $.of(preview.info)
    $().then(async () => {
      info.sound$ = await preview.service.createSound()
    })
  })

  queueMicrotask(() => {
    $.fx(() => {
      const { sound$ } = $.of(info)
      const { pane } = dspEditor.editor.info
      const { codeVisual } = pane.buffer.info
      queueMicrotask(async () => {
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
          plot.info.floats.set(result.floats)

          for (const waveData of result.waves) {
            const wave = (waveWidgets[nodeCount] ??= WaveGlWidget(pane.draw.shapes))
            wave.info.floats = wave.info.floats.length
              ? wave.info.floats
              : getFloatsGfx(`${nodeCount}`, 8192)
            wave.info.floats.set(waveData.floats)
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
      })
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

  return <div>
    <H3>
      <span>DspNode demo</span>
      <Button onpointerdown={() => {
        dspNode.info.isPlaying ? dspNode.stop() : dspNode.play()
      }}>{() => dspNode.info.isPlaying ? 'Stop' : 'Play'}</Button>
    </H3>
    {dspEditor}
    {canvas}
  </div>
}
