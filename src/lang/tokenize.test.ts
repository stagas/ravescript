import { Token, tokenize } from '~/src/lang/tokenize.ts'

describe('tokenize', () => {
  it('simple', () => {
    const source = { code: 'hello world\n123' }
    const tokens = [...tokenize(source)]
    expect(tokens.length).toBe(3)
    expect(tokens[0]).toMatchObject({
      type: Token.Type.Id,
      text: 'hello',
      line: 0,
      col: 0,
      right: 5,
      bottom: 0,
      index: 0,
      length: 5,
      source,
    })
    expect(tokens[1]).toMatchObject({
      type: Token.Type.Id,
      text: 'world',
      line: 0,
      col: 6,
      right: 11,
      bottom: 0,
      index: 6,
      length: 5,
      source,
    })
    expect(tokens[2]).toMatchObject({
      type: Token.Type.Number,
      text: '123',
      line: 1,
      col: 0,
      right: 3,
      bottom: 1,
      index: 12,
      length: 3,
      source,
    })
  })

  it('multiline', () => {
    const source = { code: '[; hello world\n123 ]' }
    const tokens = [...tokenize(source)]
    expect(tokens.length).toBe(2)
    expect(tokens[0]).toMatchObject({
      type: Token.Type.Comment,
      text: '[; hello world',
      line: 0,
      col: 0,
      right: 14,
      bottom: 0,
      index: 0,
      length: 14,
      source,
    })
    expect(tokens[1]).toMatchObject({
      type: Token.Type.Comment,
      text: '123 ]',
      line: 1,
      col: 0,
      right: 5,
      bottom: 1,
      index: 15,
      length: 5,
      source,
    })
  })
})
