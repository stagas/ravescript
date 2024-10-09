import { Sigui, type Signal } from 'sigui'
import { screen } from '~/src/screen.ts'
import { Editor } from '~/src/ui/editor/Editor'
import { H2 } from '~/src/ui/Heading.tsx'

export function EditorDemo({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
    code: `[sin 300] [tri 444] [sqr 555]
[lp 300 .8]
`,
  })

  const editor = <Editor
    width={info.$.width}
    height={info.$.height}
    code={info.$.code}
  /> as Element & { focus(): void }

  const el = <div>
    <H2>Editor demo</H2>

    {editor}
  </div>

  return { el, focus: editor.focus }
}
