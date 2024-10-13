import { Rect, type WordWrapProcessor } from 'editor'
import { wasm } from 'gfx'
import { Sigui, type Signal } from 'sigui'
import { AnimMode } from '~/src/comp/AnimMode.tsx'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { theme } from '~/src/theme.ts'
import { Editor } from '~/src/ui/Editor.tsx'
import { makeWaveform, waveform } from '~/src/ui/editor/util/waveform.ts'
import { WaveCanvasWidget } from '~/src/ui/editor/widgets/index.ts'
import { WaveGlWidget } from '~/src/ui/editor/widgets/wave-gl.ts'
import { WaveSvgWidget } from '~/src/ui/editor/widgets/wave-svg.tsx'
import { H2 } from '~/src/ui/Heading.tsx'

export function EditorDemo({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const wordWrapProcessor: WordWrapProcessor = {
    pre(input: string) {
      return input.replace(/\[(\w+)([^\]\n]+)\]/g, (_: any, word: string, chunk: string) => {
        const c = chunk.replace(/\s/g, '\u0000')
        return `[${word}${c}]`
      })
    },
    post(input: string) {
      return input.replaceAll('\u0000', ' ')
    }
  }

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
    code: `\



[dly 16 1 /]



[sin 3000000000000000] [tri 1111111] [tri 222] [tri 333] [tri 444] [tri 555] [tri 666]
    [saw 123]
  [sqr 555] @
[lp 300 .8]
[ppd (3 4 5)]
[ar 10 50] *`,
  })

  const colors: Partial<Record<Token.Type, { fill: string, stroke: string }>> = {
    [Token.Type.Native]: { fill: theme.colors.sky[500], stroke: theme.colors.sky[500] },
    [Token.Type.String]: { fill: theme.colors.fuchsia[700], stroke: theme.colors.fuchsia[700] },
    [Token.Type.Keyword]: { fill: theme.colors.orange[500], stroke: theme.colors.orange[500] },
    [Token.Type.Op]: { fill: theme.colors.sky[500], stroke: theme.colors.sky[500] },
    [Token.Type.Id]: { fill: theme.colors.yellow[500], stroke: theme.colors.yellow[500] },
    [Token.Type.Number]: { fill: theme.colors.green[500], stroke: theme.colors.green[500] },
    [Token.Type.BlockComment]: { fill: theme.colors.neutral[700], stroke: theme.colors.neutral[700] },
    [Token.Type.Comment]: { fill: theme.colors.neutral[700], stroke: theme.colors.neutral[700] },
    [Token.Type.Any]: { fill: theme.colors.neutral[500], stroke: theme.colors.neutral[500] },
  }

  function colorize(token: Token<Token.Type>) {
    const { fill = '#888', stroke = '#888' } = colors[token.type] ?? {}
    return { fill, stroke }
  }

  const editor = Editor({
    width: info.$.width,
    height: info.$.height,
    code: info.$.code,
    colorize,
    tokenize,
    wordWrapProcessor,
  })

  const pane2Info = $({
    code: 'hello\nworld'
  })
  const pane2 = editor.createPane({
    rect: $(Rect(), { x: 0, y: 210, w: 200, h: 200 }),
    code: pane2Info.$.code,
  })
  editor.addPane(pane2)

  // const shapes = editor.widgets.gfx.createShapes()
  // editor.widgets.gfx.scene.add(shapes)

  // ///////////////////
  // const floats = Object.assign(
  //   wasm.alloc(Float32Array, waveform.length),
  //   { len: waveform.length }
  // )
  // floats.set(waveform)

  // $.fx(() => {
  //   const { tokens } = editor.buffer.info
  //   $()
  //   const gens: Token[][] = []

  //   let depth = 0
  //   let gen: Token[] = []
  //   for (const token of tokens) {
  //     if (token.text === '[') {
  //       depth++
  //     }
  //     else if (token.text === ']') {
  //       gen.push(token)
  //       depth--
  //       if (!depth) {
  //         gens.push(gen)
  //         gen = []
  //       }
  //     }
  //     if (depth) gen.push(token)
  //   }

  //   if (!gens.length) return

  //   const d = WaveCanvasWidget()
  //   d.info.floats = floats
  //   Object.assign(d.widget.bounds, Token.bounds(gens[0]))
  //   editor.widgets.deco.add(d.widget)

  //   const d2 = WaveGlWidget(shapes)
  //   d2.info.floats = floats
  //   Object.assign(d2.widget.bounds, Token.bounds(gens[1]))
  //   editor.widgets.deco.add(d2.widget)

  //   const d3 = WaveSvgWidget()
  //   d3.info.floats = floats
  //   Object.assign(d3.widget.bounds, Token.bounds(gens[2]))
  //   editor.widgets.deco.add(d3.widget)
  //   editor.view.info.svgs.add(d3.svg)
  //   editor.view.info.svgs = new Set(editor.view.info.svgs)

  //   return () => {
  //     // decos.forEach(d => {
  //     editor.widgets.deco.delete(d.widget)
  //     //   d.dispose()
  //     // })
  //     editor.widgets.deco.delete(d2.widget)
  //     d2.dispose()
  //     editor.widgets.deco.delete(d3.widget)
  //     editor.view.info.svgs.delete(d3.svg)
  //     editor.view.info.svgs = new Set(editor.view.info.svgs)
  //   }
  // })
  // editor.widgets.update()

  // let t = 101
  // // editor.anim.ticks.add(() => {
  // floats.set(makeWaveform(2048, t += 1, 1 + Math.sin(t * 0.025) * 59))
  // //   return true
  // // })

  // ///////////////////

  const el = <div>
    <div class="flex items-center justify-between">
      <H2>Editor demo</H2>
      <AnimMode anim={editor.view.anim} />
    </div>
    {editor}
  </div>

  return { el, focus: editor.focus }
}
