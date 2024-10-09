import { wordWrapText } from '~/src/ui/editor/util/word-wrap-text.ts'

function l(text: string): string[] {
  return text.split('\n')
}

describe('wordWrapText', () => {
  it('[""] on empty string', () => {
    const lines = wordWrapText(l(''), 10)
    expect(lines).toEqual([''])
  })

  it('one line if text below maxLineLength', () => {
    const lines = wordWrapText(l('hello'), 10)
    expect(lines).toEqual(['hello'])
  })

  it('handle newlines', () => {
    const lines = wordWrapText(l('hello\nthere'), 10)
    expect(lines).toEqual(['hello', 'there'])
  })

  it('splits to 2 lines if text exceeds maxLineLength', () => {
    const lines = wordWrapText(l('hello world'), 10)
    expect(lines).toEqual(['hello', 'world'])
  })

  it('splits to multiple lines if text exceeds maxLineLength twice', () => {
    const lines = wordWrapText(l('hello world lorem ipsum'), 10)
    expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
  })

  it('splits words', () => {
    const lines = wordWrapText(l('helloworld loremipsum'), 8)
    expect(lines).toEqual(['hellowor', 'ld', 'loremips', 'um'])
  })

  it('splits words and lines', () => {
    const lines = wordWrapText(l('helloworld loremipsum'), 5)
    expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
  })

  it('splits words and lines with multiple spaces', () => {
    const lines = wordWrapText(l('hello  world lorem    ipsum'), 5)
    expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
  })

  it('splits words and lines with multiple spaces 2', () => {
    const lines = wordWrapText(l('hello    world lorem    ipsum'), 5)
    expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
  })

  it('handle multiple spaces and words exceeding line length', () => {
    const lines = wordWrapText(l('hello    world loremipsum'), 5)
    expect(lines).toEqual(['hello', 'world', 'lorem', 'ipsum'])
  })

  it('handle spaces at beginning of lines', () => {
    const lines = wordWrapText(l('  hello    world loremipsum'), 7)
    expect(lines).toEqual(['  hello', 'world', 'loremip', 'sum'])
  })

  it('handle spaces at beginning of lines 2', () => {
    const lines = wordWrapText(l('  hello    world loremipsum'), 5)
    expect(lines).toEqual(['  ', 'hello', 'world', 'lorem', 'ipsum'])
  })
})
