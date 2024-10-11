import { Sigui, type Signal } from 'sigui'
import { AnimMode } from '~/src/comp/AnimMode.tsx'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { theme } from '~/src/theme.ts'
import { Editor, Widget, type WordWrapProcessor } from '~/src/ui/Editor.tsx'
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


[sin 300] [tri 444] [sqr 555] @ \
[lp 300 .8] [dly 16 1 /] [ppd (3 4 5)] \
[ar 10 50] *
`,
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

  const shapes = editor.widgets.gfx.createShapes()
  editor.widgets.gfx.scene.add(shapes)

  const d1 = Widget()
  function drawRect(this: Widget, c: CanvasRenderingContext2D) {
    const r = this.rect
    c.lineWidth = 1
    c.fillStyle = theme.colors.sky[500]
    c.fillRect(r.x, r.y, r.w - .75, r.h - .75)
  }
  d1.draw = drawRect
  d1.bounds.line = 2
  d1.bounds.bottom = 2
  d1.bounds.right = 9
  d1.bounds.length = 9
  editor.widgets.deco.add(d1)

  const d2 = Widget()
  const box = shapes.Box(d2.rect)
  box.view.color = 0xff00ff
  // d2.draw = () => {}
  d2.bounds.line = 2
  d2.bounds.col = 10
  d2.bounds.bottom = 2
  d2.bounds.right = 19
  d2.bounds.length = 9
  editor.widgets.deco.add(d2)

  const d3 = Widget()
  d3.draw = drawRect
  d3.bounds.line = 2
  d3.bounds.col = 10
  d3.bounds.bottom = 2
  d3.bounds.right = 19
  d3.bounds.length = 9
  editor.widgets.subs.add(d3)

  editor.widgets.update()

  const el = <div>
    <div class="flex items-center justify-between">
      <H2>Editor demo</H2>
      <AnimMode anim={editor.anim} />
    </div>
    {editor}
  </div>

  return { el, focus: editor.focus }
}
