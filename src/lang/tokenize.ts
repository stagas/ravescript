export interface Source {
  code: string
}

export interface Token<T = any> {
  /** Token type. */
  type: T
  /** The text representation of the token. */
  text: string
  /** Zero based line number. */
  line: number
  /** Zero based column number. */
  col: number
  /** Rightmost column number, zero based. */
  right: number
  /** Bottom line, zero based. */
  bottom: number
  /** Zero based index. */
  index: number
  /** Token length. */
  length: number
  /** Reference to the source code document. */
  source: Source
}

export namespace Token {
  export enum Type {
    Newline = 'Newline',
    Whitespace = 'Whitespace',
    Native = 'Native',
    String = 'String',
    Keyword = 'Keyword',
    Op = 'Op',
    Id = 'Id',
    Number = 'Number',
    BlockComment = 'BlockComment',
    Comment = 'Comment',
    Any = 'Any',
  }

  export const typesEntries = [
    [Type.Newline, /(\n)/],
    [Type.Whitespace, /(\s+?)/],
    [Type.Native, /(`[a-z]+`)/],
    [Type.String, /('[^'\n]*['\n])/],
    [Type.Keyword, /(M|S|\\|@|,)/],
    [Type.Op, /(\?)/],
    [Type.Id, /([a-zA-Z]+[a-zA-Z0-9_]*)/],
    [Type.Number, /([0-9]+[dhk][0-9]*|[0-9]+\.[0-9]+|\.?[0-9]+)/],
    [Type.BlockComment, /(\[;|\(;|{;)/],
    [Type.Op, /(\*=|\+=|:=|\+|-|\*|\/|\^|%|!|=|\{|\}|\(|\)|\[|\]|:|\.)/],
    [Type.Comment, /(;[^\n]*)/],
    [Type.Any, /(.+?)/],
  ] as const

  export const regexp = new RegExp(
    Array.from(typesEntries,
      ([, regexp]) => regexp.source
    ).join('|'),
    'g'
  )

  export const Empty: Token = {
    type: 0,
    text: '',
    line: 0,
    col: 0,
    right: 0,
    bottom: 0,
    index: 0,
    length: 0,
    source: { code: '' }
  }

  export const Close = {
    '[': ']',
    '(': ')',
    '{': '}',
  } as const

  export function isTerminal(token: Token) {
    switch (token.type) {
      case Type.Any:
      case Type.Comment: return false
    }
    return true
  }

  export function closeOf(token: Token) {
    return Close[token.text as keyof typeof Close].charCodeAt(0)
  }

  export function bounds(tokens: Token[]) {
    let line: number = Infinity
    let col: number = Infinity
    let right: number = 0
    let index: number = Infinity
    let bottom: number = 0
    let end: number = 0

    let t: { line: number, col: number, right: number, index: number, length: number }

    for (const t of tokens) {
      if (t.index < index) index = t.index
      if (t.index + t.length > end) end = t.index + t.length
      if (t.line < line) line = t.line
      if (t.line > bottom) bottom = t.line
      if (t.col < col && t.line === line) col = t.col
      if (t.right > right) right = t.right
    }

    return { line, col, right, bottom, index, length: end - index }
  }
}

export function* tokenize(source: Source): Generator<Token, void, unknown> {
  const code = source.code
  let i = 0
  let text: string | null
  let type: Token.Type
  let line = 0
  let lineIndex = 0
  let depth = 0
  let col = 0
  let match: RegExpMatchArray
  let begin: RegExpMatchArray
  let slice: string
  let open: keyof typeof Token.Close
  let close: typeof Token.Close[keyof typeof Token.Close]
  const length = Token.typesEntries.length + 1
  const it = code.matchAll(Token.regexp)
  outer: for (match of it) {
    for (i = 1; i < length; i++) {
      text = match[i]
      if (text != null) {
        type = Token.typesEntries[i - 1][0]
        switch (type) {
          case Token.Type.Whitespace:
            break
          case Token.Type.Newline:
            ++line
            lineIndex = match.index! + 1
            break
          case Token.Type.BlockComment: {
            type = Token.Type.Comment
            begin = match
            open = text[0] as keyof typeof Token.Close
            close = Token.Close[open]
            depth = 1
            for (const m of it) {
              for (let x = 0, t: string; x < length; x++) {
                t = m[x]
                if (t != null) {
                  if (t === '\n') {
                    col = begin.index! - lineIndex
                    slice = code.slice(begin.index, m.index!)
                    yield {
                      type,
                      text: slice,
                      line,
                      col,
                      right: col + slice.length,
                      bottom: line,
                      index: begin.index!,
                      length: slice.length,
                      source
                    }
                    begin = m

                    ++line
                    lineIndex = ++m.index!
                  }
                  else if (t === open) depth++
                  else if (t === close) {
                    if (!--depth) {
                      col = begin.index! - lineIndex
                      slice = code.slice(begin.index, m.index! + 1)
                      yield {
                        type,
                        text: slice,
                        line,
                        col,
                        right: col + slice.length,
                        bottom: line,
                        index: begin.index!,
                        length: slice.length,
                        source
                      }
                      continue outer
                    }
                  }
                  break
                }
              }
            }
            break
          }
          default:
            col = match.index! - lineIndex
            yield {
              type,
              text,
              line,
              col,
              right: col + text.length,
              bottom: line,
              index: match.index!,
              length: text.length,
              source
            }
        }
        break
      }
    }
  }
}

if (import.meta.vitest) {
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
}
