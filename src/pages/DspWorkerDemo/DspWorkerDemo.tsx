import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import { Sigui } from 'sigui'
import { assign, Lru, rpc } from 'utils'
import { PreviewService } from '~/src/as/dsp/preview-service.ts'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
import basicProcessorUrl from '~/src/pages/DspWorkerDemo/basic-processor.ts?url'
import { QUEUE_SIZE } from '~/src/pages/DspWorkerDemo/constants'
import { DspWorker } from '~/src/pages/DspWorkerDemo/dsp-worker'
import DspWorkerFactory from '~/src/pages/DspWorkerDemo/dsp-worker.ts?worker'
import { FreeQueue } from '~/src/pages/DspWorkerDemo/free-queue'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { WaveGlWidget } from '~/src/ui/editor/widgets/wave-gl.ts'
import { H3 } from '~/src/ui/Heading.tsx'

const getFloatsGfx = Lru(20, (key: string, length: number) => wasmGfx.alloc(Float32Array, length), item => item.fill(0), item => item.free())

export function DspWorkerDemo() {
  using $ = Sigui()

  const info = $({
    width: 400,
    height: 300,
    code: `t 8* x=
[sin 67.51 346
[exp 1.00 x trig=] 18.95^ * + x trig=]
[exp 1.00 x trig=] 6.26^ * [sno 83 .9] [dclipexp 1.535] [clip .44]

[saw 42 x trig=] [clip .4] .52* [slp 100 2336 [exp 8 x trig=] .2^ * +  .92] [exp 8 x trig=] .2^ * [lp 800]
`,
    floats: new Float32Array(),
    sound$: null as null | number,
    error: null as null | Error,
    codeWorking: '',
  })
  const inputQueue = new FreeQueue(QUEUE_SIZE, 1)
  const outputQueue = new FreeQueue(QUEUE_SIZE, 1)
  // Create an atomic state for synchronization between worker and AudioWorklet.
  const atomicState = new Int32Array(new SharedArrayBuffer(1 * Int32Array.BYTES_PER_ELEMENT))
  const cmd = new Uint8Array(new SharedArrayBuffer(1 * Uint8Array.BYTES_PER_ELEMENT))
  const state = new Uint8Array(new SharedArrayBuffer(16384 * Uint8Array.BYTES_PER_ELEMENT))

  const dspWorker = new DspWorkerFactory()
  $.fx(() => () => dspWorker.terminate())

  const dspService = rpc<DspWorker>(dspWorker, {
    isReady() {
      dspService.setup({
        sampleRate: audioContext.sampleRate,
        inputQueue,
        outputQueue,
        atomicState,
        cmd,
        state,
      })
    }
  })


  const audioContext = new AudioContext({ latencyHint: 0.000001 })
  $.fx(() => () => audioContext.close())

  const encoder = new TextEncoder()

  $.fx(() => {
    const { codeWorking } = info
    $()
    const encoded = encoder.encode(codeWorking)
    state.set(encoded)
    cmd[0] = encoded.length
  })

  $.fx(() => {
    $().then(async () => {
      await audioContext.audioWorklet.addModule(basicProcessorUrl)

      const processorNode = new AudioWorkletNode(audioContext, 'basic-processor', {
        processorOptions: {
          inputQueue,
          outputQueue,
          atomicState,
        }
      })

      const osc = new OscillatorNode(audioContext)
      osc.connect(processorNode).connect(audioContext.destination)
    })
  })

  const preview = PreviewService(audioContext)
  $.fx(() => preview.dispose)

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
    <H3>Dsp Node demo</H3>
    {dspEditor}
    {canvas}
  </div>
}
