import { describe, expect, it, mock } from "bun:test"
import { interpret } from '~/src/lang/interpreter.ts'
import { tokenize } from '~/src/lang/tokenize.ts'

describe('interpret', () => {
  it('works', () => {
    const tokens = Array.from(tokenize({ code: '[sin 42]' }))
    const api = {
      gen: { sin: mock() }
    } as any
    const result = interpret(api, {}, tokens)
    expect(api.gen.sin).toHaveBeenCalledTimes(1)
    expect(api.gen.sin).toHaveBeenCalledWith({ hz: { value: 42, format: 'f', digits: 0 } })
  })
  it('procedure', () => {
    const tokens = Array.from(tokenize({
      code: `
      { x= x 2 * } double=
      [sin 21 double]
    ` }))
    const api = {
      math: {
        '*': mock((a: any, b: any) => {
          return { value: a.value * b.value }
        })
      },
      gen: { sin: mock() }

    } as any
    const result = interpret(api, {}, tokens)
    expect(api.gen.sin).toHaveBeenCalledTimes(1)
    expect(api.gen.sin).toBeCalledWith({ hz: { value: 42 } })
  })
})
