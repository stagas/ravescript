/*

- collab tracks

*/

import { Signal } from 'signal-jsx'
import { Code } from './Code.tsx'
import { Source } from '../source.ts'
import { tokenize } from '../lang/tokenize.ts'
import { Rect } from 'std'
import { screen } from '../screen.tsx'

const DEBUG = true

const sounds = [
  { code: 'K:[sin 300 [are .01 .03 5] 100*+] [are .01 .1 8]*'},
  { code: 'h:[noise 44] [are .04 .2]*' },
  { code: 'o:[noise 88] [are .03 .8]*' },
  { code: 's:[sample \'sd\']' },
  { code: 'K---' },
  { code: '--h-hh-h' },
  { code: '-o' },
  { code: '---s' },
]

export function Black() {
  using $ = Signal()

  // const codeView = $(new Rect(), {
  //   pr: screen.info.$.pr,
  // })
  const code = Code(screen.info.rect)

  $.fx(() => {
    const { editor } = $.of(code.editor)
    $()
    editor.buffer.source = $(new Source(tokenize), {
      code: sounds
        .map(s => s.code)
        .join('\n')
    })
  })

  return <main class="bg-black h-full">
    <div>
      {code.canvas}
      {code.textarea}
    </div>
  </main>
}
