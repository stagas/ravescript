import { Dsp, wasm as wasmDsp } from 'dsp'
import { Gfx, Matrix, Rect, wasm as wasmGfx } from 'gfx'
import { Sigui } from 'sigui'
import { assign, Lru } from 'utils'
import { DspEditor } from '~/src/comp/DspEditor.tsx'
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

        program.value.results.sort((a: any, b: any) =>
          a.result.captured[0].line ===
            b.result.captured[0].line
            ? a.result.captured[0].col -
            b.result.captured[0].col
            : a.result.captured[0].line -
            b.result.captured[0].line
        )

        let last
        for (const node of program.value.results) {
          if ('genId' in node) {
            const bounds = Token.bounds(node.result.captured)
            if (last && last.bounds.line === bounds.line && last.bounds.right > bounds.col) {
              last.bounds.right = bounds.col - 1
              last.wave.widget.bounds.right = bounds.col - 1
              // console.log('yes')
            }
            // console.log(nodeCount, bounds)
            const wave = (waveWidgets[nodeCount] ??= WaveGlWidget(pane.draw.shapes))
            wave.info.floats = wave.info.floats.length ? wave.info.floats : getFloatsGfx(`${nodeCount}`, 8192)
            wave.info.floats.set(sound.getAudio(node.result.value.ptr))
            assign(wave.widget.bounds, bounds)
            pane.draw.widgets.deco.add(wave.widget)
            node.bounds = bounds
            node.wave = wave
            last = node
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
