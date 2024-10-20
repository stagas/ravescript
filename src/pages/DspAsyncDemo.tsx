import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import { Sigui } from 'sigui'
import { assign, Lru } from 'utils'
import { BUFFER_SIZE } from '~/as/assembly/dsp/constants.ts'
import { PreviewService } from '~/src/as/dsp/preview-service'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { WaveGlWidget } from '~/src/ui/editor/widgets/wave-gl.ts'
import { H2 } from '~/src/ui/Heading.tsx'

const getFloatsGfx = Lru(20, (key: string, length: number) => wasmGfx.alloc(Float32Array, length), item => item.fill(0), item => item.free())

export function DspAsyncDemo() {
  using $ = Sigui()

  const info = $({
    width: 400,
    height: 300,
    code: `[sin 42.11 303
[exp 2.00] 6.66^ * +]
[exp 1.00] 9.99^ *
`,
    floats: new Float32Array(),
    sound$: null as null | number,
    error: null as null | Error,
  })

  const ctx = new AudioContext({ sampleRate: 48000 })

  const preview = PreviewService(ctx)
  $.fx(() => preview.dispose)

  const length = BUFFER_SIZE

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
      $().then(async () => {
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
          plot.info.floats.set(result.floats)

          for (const waveData of result.waves) {
            const wave = (waveWidgets[nodeCount] ??= WaveGlWidget(pane.draw.shapes))
            wave.info.floats = wave.info.floats.length
              ? wave.info.floats
              : getFloatsGfx(`${nodeCount}`, BUFFER_SIZE)
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
    console.error(error)
    dspEditor.info.error = error
    return () => dspEditor.info.error = null
  })

  return <div>
    <H2>Dsp Async demo</H2>
    {dspEditor}
    {canvas}
  </div>
}
