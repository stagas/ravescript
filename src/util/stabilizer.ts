import { BUFFER_SIZE } from '~/as/assembly/dsp/constants.ts'

// based on https://github.com/fenomas/webaudio-viz/blob/master/src/index.js
export class Stabilizer {
  // overly magical ad-hoc routine to choose where to start drawing data
  numOffsets = 32
  offsetsSpan = 128
  offsets: Uint32Array = Uint32Array.from({ length: this.numOffsets }).map((_, i) =>
    ((this.offsetsSpan / this.numOffsets) * ((i / this.numOffsets) ** 9) * this.numOffsets) | 0
  )
  // numOffsets = 10
  // offsetsSpan = 320
  // offsets: number[] = Array.from({ length: this.numOffsets }).map((_, i) =>
  //   ((this.offsetsSpan / this.numOffsets) * ((i / this.numOffsets) ** 1.3) * this.numOffsets) | 0
  // )
  prev = new Float32Array(this.numOffsets)
  points = new Float32Array(this.numOffsets)

  findStartingPoint(data: Float32Array) {
    let count = 0
    let p = 0

    // console.log(this.offsets)
    while (count < this.numOffsets && p >= 0) {
      p = this.findUpwardsZeroCrossing(data, p, BUFFER_SIZE >> 4)
      if (p > 0)
        this.points[count++] = p
    }
    if (count < 2) return 0
    // if (count < 2) return this.points[0] || 0

    // try to find a starting point similar to the previous one
    p = 0
    let bestScore = 999999.9
    for (let i = 0, np = 0; i < count; i++) {
      np = this.points[i]!
      const score = this.scorePoint(np, data)
      if (score > bestScore) continue
      bestScore = score * 0.98 - 1
      p = np
    }

    for (let i = 0; i < this.numOffsets; i++)
      this.prev[i] = data[this.offsets[i]! + p]!

    return p + -(p > 1)
  }

  scorePoint(pt: number, data: Float32Array) {
    let acc = 0
    for (let i = 0; i < this.numOffsets; i++)
      acc += Math.abs(data[pt + this.offsets[i]!]! - this.prev[i]!)
    return acc
  }

  findUpwardsZeroCrossing(data: Float32Array, start: number, end: number) {
    for (let ct = 0, i = start; i < end; i++) {
      if (data[i]! < 0) ct++
      if (data[i]! > 0 && ct > 0) return i
    }
    return -1
  }
}
