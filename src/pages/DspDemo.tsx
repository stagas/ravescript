import { Dsp, wasm as wasmDsp } from 'dsp'
import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import { Sigui } from 'sigui'
import { assign, Lru } from 'utils'
import type { Value } from '~/src/as/dsp/value.ts'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
import type { AstNode, ProgramValueResult } from '~/src/lang/interpreter.ts'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { Canvas } from '~/src/ui/Canvas.tsx'
import type { Editor } from '~/src/ui/Editor.tsx'
import { WaveGlWidget } from '~/src/ui/editor/widgets/wave-gl.ts'
import { H2 } from '~/src/ui/Heading.tsx'

const getFloats = Lru(20, (key: string, length: number) => wasmDsp.alloc(Float32Array, length), item => item.fill(0), item => item.free())
const getFloatsGfx = Lru(20, (key: string, length: number) => wasmGfx.alloc(Float32Array, length), item => item.fill(0), item => item.free())
const getBuffer = Lru(20, (length: number) => wasmDsp.alloc(Float32Array, length), item => item.fill(0), item => item.free())
const getPointers = Lru(20, (length: number) => wasmDsp.alloc(Uint32Array, length), item => item.fill(0), item => item.free())

export function DspDemo() {
  using $ = Sigui()

  const info = $({
    width: 400,
    height: 300,
    code: `[sin 40.10 303 [exp 2.01] 5.20^ * +] [exp 1.00] 9.99^ *`,
    floats: new Float32Array(),
  })

  const ctx = new AudioContext({ sampleRate: 48000 })
  const dsp = Dsp({ sampleRate: ctx.sampleRate })
  const { clock } = dsp
  const sound = dsp.Sound()

  const barsCount = .25
  const length = 8192 //Math.floor(barsCount * clock.sampleRate / clock.coeff)

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

  requestAnimationFrame(() => {
    $.fx(() => {
      const { pane } = dspEditor.info
      const { codeVisual } = pane.buffer.info
      $()

      sound.reset()
      const tokens = Array.from(tokenize({ code: codeVisual }))
      const { program, out } = sound.process(tokens, 6, false, 0)
      if (!out.LR) {
        throw new Error('No audio in the stack.')
      }
      const floats = getFloats('floats', length)
      info.floats = floats
      const notes = []
      const params = []
      const notesData = getBuffer(notes.length * 4)
      const paramsData = getPointers(params.length * 2)
      wasmDsp.fillSound(
        sound.sound$,
        sound.ops.ptr,
        notesData.ptr,
        notes.length,
        paramsData.ptr,
        params.length,
        out.LR.getAudio(),
        0,
        floats.length,
        floats.ptr,
      )


      // pane.draw.widgets.update()

      plot.info.floats.set(floats)
      requestAnimationFrame($.fn(() => {
        c.meshes.draw()
        let nodeCount = 0

        program.value.results.sort(({ result: { bounds: a } }, { result: { bounds: b } }) =>
          a.line === b.line
            ? a.col - b.col
            : a.line - b.line
        )

        let last: AstNode | null = null
        const waves = new Map<AstNode, WaveGlWidget>()
        for (const node of program.value.results) {
          if ('genId' in node) {
            const bounds = node.result.bounds
            if (last && last.bounds.line === bounds.line && last.bounds.right > bounds.col) {
              last.bounds.right = bounds.col - 1
              waves.get(last)!.widget.bounds.right = bounds.col - 1
            }
            const wave = (waveWidgets[nodeCount] ??= WaveGlWidget(pane.draw.shapes))
            wave.info.floats = wave.info.floats.length ? wave.info.floats : getFloatsGfx(`${nodeCount}`, 8192)
            wave.info.floats.set(sound.getAudio((node.result.value as Value.Audio).ptr))
            assign(wave.widget.bounds, bounds)
            pane.draw.widgets.deco.add(wave.widget)
            waves.set(node.result, wave)
            last = node.result
            nodeCount++
          }
        }

        pane.draw.info.triggerUpdateTokenDrawInfo++
        pane.view.anim.info.epoch++
      }))
    })
  })
  const dspEditor = <DspEditor
    width={info.$.width}
    height={info.$.height}
    code={info.$.code}
  /> as Editor

  return <div>
    <H2>Dsp demo</H2>
    {dspEditor}
    {canvas}
  </div>
}
