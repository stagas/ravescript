import { tokenize } from '~/src/lang/tokenize.ts'

export const preTokens = Array.from(tokenize({
  // we implicit call [nrate 1] before our code
  // so that the sample rate is reset.
  code: ` [nrate 1] `
    // some builtin procedures
    // + ` { .5* .5+ } norm= `
    // + ` { at= p= sp= 1 [inc sp co* at] clip - p^ } dec= `
    + ` { x= 2 x 69 - 12 / ^ 440 * } ntof= `
    + ` [zero] `
}))

export const postTokens = Array.from(tokenize({
  code: `@`
}))
