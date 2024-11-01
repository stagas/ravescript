import { $ } from 'sigui'
import { tokenize } from '~/src/lang/tokenize.ts'
import { Buffer } from '~/src/ui/editor/buffer.ts'
import { Dims } from '~/src/ui/editor/dims.ts'
import { Rect } from '~/src/ui/editor/util/types.ts'

function B(code: string, maxWidth: number, breakWords = true) {
  const info = $({ code, width: maxWidth, height: 300 })
  const rect = $(Rect(), { w: 100 })
  const dims = Dims({ rect })
  dims.info.charWidth = 100 / maxWidth
  const b = Buffer({ dims, code: info.$.code, tokenize })
  b.info.maxColumns = maxWidth
  b.info.breakWords = breakWords
  return b
}

describe('TextBuffer', () => {
  describe('linesVisual', () => {
    it('word wrap is applied', () => {
      const b = B('', 10)
      expect(b.info.linesVisual).toEqual([
        { text: '' }
      ])
    })

    it('one line if text below maxLineLength', () => {
      const b = B('hello', 10)
      expect(b.info.linesVisual).toEqual([
        { text: 'hello' }
      ])
    })

    it('handle newlines', () => {
      const b = B('hello\nworld', 10)
      expect(b.info.linesVisual).toEqual([
        { text: 'hello', br: true },
        { text: 'world' },
      ])
    })

    it('splits to 2 lines if text exceeds maxLineLength', () => {
      const b = B('hello world', 10)
      expect(b.info.linesVisual).toEqual([
        { text: 'hello ' },
        { text: 'world' },
      ])
    })

    it('splits to multiple lines if text exceeds maxLineLength twice', () => {
      const b = B('hello world lorem ipsum', 10)
      expect(b.info.linesVisual).toEqual([
        { text: 'hello ' },
        { text: 'world ' },
        { text: 'lorem ' },
        { text: 'ipsum' }
      ])
    })

    it('breaks words', () => {
      const b = B('helloworld loremipsum', 8)
      expect(b.info.linesVisual).toEqual([
        { text: 'hellowor' },
        { text: 'ld ' },
        { text: 'loremips' },
        { text: 'um' },
      ])
    })

    it('does not break words when breakWords=false', () => {
      const b = B('helloworld loremipsum', 8, false)
      b.info.breakWords = false
      expect(b.info.linesVisual).toEqual([
        { text: 'helloworld ' },
        { text: 'loremipsum' },
      ])
    })

    // it('splits words and lines', () => {
    //   const lines = wordWrapText(l('helloworld loremipsum'), 5)
    //   expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
    // })

    // it('splits words and lines with multiple spaces', () => {
    //   const lines = wordWrapText(l('hello  world lorem    ipsum'), 5)
    //   expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
    // })

    // it('splits words and lines with multiple spaces 2', () => {
    //   const lines = wordWrapText(l('hello    world lorem    ipsum'), 5)
    //   expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
    // })

    // it('handle multiple spaces and words exceeding line length', () => {
    //   const lines = wordWrapText(l('hello    world loremipsum'), 5)
    //   expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
    // })

    it('handle spaces at beginning of lines', () => {
      const b = B('  hello    world loremipsum', 7)
      expect(b.info.linesVisual).toEqual([
        { text: '  ' },
        { text: 'hello    ' },
        { text: 'world ' },
        { text: 'loremip' },
        { text: 'sum' },
      ])
    })

    it('handle spaces at beginning of lines 2', () => {
      const b = B('  hello    world loremipsum', 5)
      expect(b.info.linesVisual).toEqual([
        { text: '  ' },
        { text: 'hello  ' },
        { text: '  ' },
        { text: 'world ' },
        { text: 'lorem' },
        { text: 'ipsum' },
      ])
    })
  })

  describe('visualPointToIndex / indexToVisualPoint / indexToLogicalPoint', () => {
    it('works', () => {
      const b = B(`\
hello world
lorem ipsum
`, 10)
      {
        const i = b.visualPointToIndex({ x: 0, y: 4 })
        expect(i).toEqual(24)
        {
          const p = b.indexToVisualPoint(24)
          expect(p).toEqual({ x: 0, y: 4 })
        }
        {
          const p = b.indexToLogicalPoint(24)
          expect(p).toEqual({ x: 0, y: 2 })
        }
      }
      {
        const i = b.visualPointToIndex({ x: 0, y: 1 })
        expect(i).toEqual(6)
        {
          const p = b.indexToVisualPoint(6)
          expect(p).toEqual({ x: 0, y: 1 })
        }
        {
          const p = b.indexToLogicalPoint(6)
          expect(p).toEqual({ x: 6, y: 0 })
        }
      }
      {
        const i = b.visualPointToIndex({ x: 3, y: 3 })
        expect(i).toEqual(21)
        {
          const p = b.indexToVisualPoint(21)
          expect(p).toEqual({ x: 3, y: 3 })
        }
        {
          const p = b.indexToLogicalPoint(21)
          expect(p).toEqual({ x: 9, y: 1 })
        }
      }
      {
        const i = b.visualPointToIndex({ x: 3, y: 2 })
        expect(i).toEqual(15)
        {
          const p = b.indexToVisualPoint(15)
          expect(p).toEqual({ x: 3, y: 2 })
        }
        {
          const p = b.indexToLogicalPoint(15)
          expect(p).toEqual({ x: 3, y: 1 })
        }
      }
      {
        const i = b.visualPointToIndex({ x: 3, y: 1 })
        expect(i).toEqual(9)
        {
          const p = b.indexToVisualPoint(9)
          expect(p).toEqual({ x: 3, y: 1 })
        }
        {
          const p = b.indexToLogicalPoint(9)
          expect(p).toEqual({ x: 9, y: 0 })
        }
      }
      {
        const i = b.visualPointToIndex({ x: 3, y: 0 })
        expect(i).toEqual(3)
        {
          const p = b.indexToVisualPoint(3)
          expect(p).toEqual({ x: 3, y: 0 })
        }
        {
          const p = b.indexToLogicalPoint(3)
          expect(p).toEqual({ x: 3, y: 0 })
        }
      }
    })
  })

  describe('indexToVisualPoint', () => {
    it('splits to multiple lines if text exceeds maxLineLength twice', () => {
      const b = B(`\
aaa
bbbbb ccccccc`, 10)
      {
        const i = b.visualPointToIndex({ x: 7, y: 2 })
        expect(i).toEqual(17)
        const j = b.indexToVisualPoint(17)
        expect(j).toEqual({ x: 7, y: 2 })
      }
      {
        const i = b.visualPointToIndex({ x: 7, y: 1 })
        expect(i).toEqual(9)
        const j = b.indexToVisualPoint(9)
        expect(j).toEqual({ x: 5, y: 1 })
      }
    })
  })
})
