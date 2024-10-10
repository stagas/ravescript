import { Sigui, type Signal } from 'sigui'
import { screen } from '~/src/screen.ts'
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
[sin 300] [tri 444] [sqr 555] \
[lp 300 .8] [dly 16 1 /] [pp 3 4 5] \
[ar 10 50]
`,
  })

  const editor = <Editor
    width={info.$.width}
    height={info.$.height}
    code={info.$.code}
    wordWrapProcessor={wordWrapProcessor}
  /> as Element & { focus(): void }

  const el = <div>
    <H2>Editor demo</H2>

    {editor}
  </div>

  return { el, focus: editor.focus }
}
