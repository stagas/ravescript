import { pointToIndex } from '~/src/ui/editor/util/point-to-index.ts'

describe('pointToIndex', () => {
  it('return 0 for empty code', () => {
    expect(pointToIndex({ x: 0, y: 0 }, '')).toBe(0)
  })

  it('return 0 for empty code and point that exceeds bounds', () => {
    expect(pointToIndex({ x: 1, y: 0 }, '')).toBe(0)
    expect(pointToIndex({ x: 0, y: 1 }, '')).toBe(0)
    expect(pointToIndex({ x: 1, y: 1 }, '')).toBe(0)
  })

  it('correctly stays within bounds for code with one line', () => {
    expect(pointToIndex({ x: 0, y: 0 }, 'a')).toBe(0)
    expect(pointToIndex({ x: 1, y: 0 }, 'a')).toBe(1)
    expect(pointToIndex({ x: 2, y: 0 }, 'a')).toBe(1)
    expect(pointToIndex({ x: 0, y: 1 }, 'a')).toBe(1)
    expect(pointToIndex({ x: 0, y: 2 }, 'a')).toBe(1)
    expect(pointToIndex({ x: 1, y: 1 }, 'a')).toBe(1)
    expect(pointToIndex({ x: 1, y: 2 }, 'a')).toBe(1)
    expect(pointToIndex({ x: 2, y: 2 }, 'a')).toBe(1)
  })

  it('correctly stays within bounds for code with two lines', () => {
    expect(pointToIndex({ x: 0, y: 0 }, 'a\nb')).toBe(0)
    expect(pointToIndex({ x: 1, y: 0 }, 'a\nb')).toBe(1)
    expect(pointToIndex({ x: 2, y: 0 }, 'a\nb')).toBe(1)
    expect(pointToIndex({ x: 0, y: 1 }, 'a\nb')).toBe(2)
    expect(pointToIndex({ x: 0, y: 2 }, 'a\nb')).toBe(3)
    expect(pointToIndex({ x: 1, y: 1 }, 'a\nb')).toBe(3)
    expect(pointToIndex({ x: 1, y: 2 }, 'a\nb')).toBe(3)
    expect(pointToIndex({ x: 2, y: 2 }, 'a\nb')).toBe(3)
  })

  it('correctly stays within bounds for code with multiple lines', () => {
    expect(pointToIndex({ x: 0, y: 0 }, 'aa\nbb\ncc')).toBe(0)
    expect(pointToIndex({ x: 1, y: 0 }, 'aa\nbb\ncc')).toBe(1)
    expect(pointToIndex({ x: 2, y: 0 }, 'aa\nbb\ncc')).toBe(2)
    expect(pointToIndex({ x: 3, y: 0 }, 'aa\nbb\ncc')).toBe(2)

    expect(pointToIndex({ x: 0, y: 1 }, 'aa\nbb\ncc')).toBe(3)
    expect(pointToIndex({ x: 1, y: 1 }, 'aa\nbb\ncc')).toBe(4)
    expect(pointToIndex({ x: 2, y: 1 }, 'aa\nbb\ncc')).toBe(5)
    expect(pointToIndex({ x: 3, y: 1 }, 'aa\nbb\ncc')).toBe(5)

    expect(pointToIndex({ x: 0, y: 2 }, 'aa\nbb\ncc')).toBe(6)
    expect(pointToIndex({ x: 1, y: 2 }, 'aa\nbb\ncc')).toBe(7)
    expect(pointToIndex({ x: 2, y: 2 }, 'aa\nbb\ncc')).toBe(8)
    expect(pointToIndex({ x: 3, y: 2 }, 'aa\nbb\ncc')).toBe(8)

    expect(pointToIndex({ x: 0, y: 3 }, 'aa\nbb\ncc')).toBe(8)
    expect(pointToIndex({ x: 1, y: 3 }, 'aa\nbb\ncc')).toBe(8)
    expect(pointToIndex({ x: 2, y: 3 }, 'aa\nbb\ncc')).toBe(8)
    expect(pointToIndex({ x: 3, y: 3 }, 'aa\nbb\ncc')).toBe(8)
  })
})
