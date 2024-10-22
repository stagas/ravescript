import { Dsp, wasm as wasmDsp } from 'dsp'
import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import { Sigui } from 'sigui'
import { assign, Lru } from 'utils'
import { BUFFER_SIZE } from '~/as/assembly/dsp/constants.ts'
import type { Value } from '~/src/as/dsp/value.ts'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
import type { AstNode } from '~/src/lang/interpreter.ts'
import { tokenize } from '~/src/lang/tokenize.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'
import { WaveGlDecoWidget } from '~/src/ui/editor/widgets/wave-gl-deco'
import { H2 } from '~/src/ui/Heading.tsx'

const getFloats = Lru(20, (key: string, length: number) => wasmDsp.alloc(Float32Array, length), item => item.fill(0), item => item.free())
const getFloatsGfx = Lru(20, (key: string, length: number) => wasmGfx.alloc(Float32Array, length), item => item.fill(0), item => item.free())
const getBuffer = Lru(20, (length: number) => wasmDsp.alloc(Float32Array, length), item => item.fill(0), item => item.free())
const getPointers = Lru(20, (length: number) => wasmDsp.alloc(Uint32Array, length), item => item.fill(0), item => item.free())

export function DspSyncDemo() {
  using $ = Sigui()

  const info = $({
    width: 400,
    height: 300,
    code: `[sin 42.11 303
[exp 2.01] 6.66^ * +]
[exp 1.00] 9.99^ *
`,
    floats: new Float32Array(),
    error: null as Error | null,
  })

  const ctx = new AudioContext({ sampleRate: 48000 })
  const dsp = Dsp({ sampleRate: ctx.sampleRate })
  const sound = dsp.Sound()

  const length = BUFFER_SIZE

  const canvas = <Canvas width={info.$.width} height={info.$.height} /> as HTMLCanvasElement
  const gfx = Gfx({ canvas })
  const view = Rect(0, 0, 500, 500)
  const matrix = Matrix()
  const c = gfx.createContext(view, matrix)
  const shapes = c.createShapes()
  c.sketch.scene.add(shapes)

  const plot = WaveGlDecoWidget(shapes)
  plot.widget.rect.w = 400
  plot.widget.rect.h = 300
  plot.info.floats = wasmGfx.alloc(Float32Array, length)

  const waveWidgets: WaveGlDecoWidget[] = []

  queueMicrotask(() => {
    $.fx(() => {
      const { pane } = dspEditor.editor.info
      const { codeVisual } = pane.buffer.info
      $()
      pane.draw.widgets.deco.clear()
      plot.info.floats.fill(0)
      let nodeCount = 0

      try {
        const tokens = Array.from(tokenize({ code: codeVisual }))

        sound.reset()
        const { program, out } = sound.process(tokens)
        if (!out.LR) throw new Error('No audio in the stack!')

        const floats = getFloats('floats', length)
        info.floats = floats

        wasmDsp.fillSound(
          sound.sound$,
          sound.ops.ptr,
          out.LR.getAudio(),
          0,
          floats.length,
          floats.ptr,
        )

        plot.info.floats.set(floats)

        program.value.results.sort(({ result: { bounds: a } }, { result: { bounds: b } }) =>
          a.line === b.line
            ? a.col - b.col
            : a.line - b.line
        )

        let last: AstNode | null = null
        const waves = new Map<AstNode, WaveGlDecoWidget>()

        for (const node of program.value.results) {
          if ('genId' in node) {
            const bounds = node.result.bounds
            if (last && last.bounds.line === bounds.line && last.bounds.right > bounds.col) {
              last.bounds.right = bounds.col - 1
              waves.get(last)!.widget.bounds.right = bounds.col - 1
            }
            const wave = (waveWidgets[nodeCount] ??= WaveGlDecoWidget(pane.draw.shapes))
            wave.info.floats = wave.info.floats.length
              ? wave.info.floats
              : getFloatsGfx(`${nodeCount}`, BUFFER_SIZE)
            wave.info.floats.set(sound.getAudio((node.result.value as Value.Audio).ptr))
            assign(wave.widget.bounds, bounds)
            pane.draw.widgets.deco.add(wave.widget)
            waves.set(node.result, wave)
            last = node.result
            nodeCount++
          }
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

  const dspEditor = DspEditor({
    width: info.$.width,
    height: info.$.height,
    code: info.$.code,
  })

  return <div>
    <H2>Dsp Sync demo</H2>
    {dspEditor}
    {canvas}
  </div>
}
