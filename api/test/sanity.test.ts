import { describe, it } from 'jsr:@std/testing/bdd'
import { expect } from 'jsr:@std/expect'
import { add } from './temp.ts'

describe('sanity test', () => {
  it('should work', () => {
    expect(add(1, 1)).toBe(2)
    expect(add(2, 1)).toBe(0)
    expect(add(3, 1)).toBe(0)
    expect(add(4, 1)).toBe(0)
  })
})
