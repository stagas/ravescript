import { Sigui, type Signal } from 'sigui'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { theme } from '~/src/theme.ts'
import { Editor, type WordWrapProcessor } from '~/src/ui/Editor.tsx'
import { H2 } from '~/src/ui/Heading.tsx'

export function EditorDemo({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const wordWrapProcessor: WordWrapProcessor = {
    pre(input: string) {
      return input.replace(/\[(\w+)([^\]]+)\]/g, (_: any, word: string, chunk: string) => {
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

  const editor = <Editor
    width={info.$.width}
    height={info.$.height}
    code={info.$.code}
    colorize={colorize}
    tokenize={tokenize}
    wordWrapProcessor={wordWrapProcessor}
  /> as Element & { focus(): void }

  const el = <div>
    <H2>Editor demo</H2>

    {editor}
  </div>

  return { el, focus: editor.focus }
}
