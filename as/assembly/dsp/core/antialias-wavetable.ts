import { nextPowerOfTwo } from '../../util'
import { ANTIALIAS_WAVETABLE_OVERSAMPLING, WAVETABLE_SIZE } from './constants'
import { fft } from './fft'

class Real {
  @inline static saw(real: StaticArray<f32>, i: u32, j: u32): void {
    const temp: f32 = -1.0 / f32(i)
    real[i] = temp
    real[j] = -temp
  }

  @inline static ramp(real: StaticArray<f32>, i: u32, j: u32): void {
    const temp: f32 = -1.0 / f32(i)
    real[i] = -temp
    real[j] = temp
  }

  @inline static sqr(real: StaticArray<f32>, i: u32, j: u32): void {
    const temp: f32 = i & 0x01 ? 1.0 / f32(i) : 0.0
    real[i] = -temp
    real[j] = temp
  }

  static sign: f32 = 1.0
  @inline static tri(real: StaticArray<f32>, i: u32, j: u32): void {
    const temp: f32 = i & 0x01 ? 1.0 / f32(i * i) * (this.sign = -this.sign) : 0.0
    real[i] = temp
    real[j] = -temp
  }
}

export class AntialiasWavetable {
  real: StaticArray<f32>
  imag: StaticArray<f32>
  freqs: StaticArray<f32>
  topFreq: f64
  maxHarms: u32
  numOfTables: u32
  tableLength: u32
  tableMask: u32
  tableIndex: u32 = 0
  stepShift: i32 = 0
  sampleRate: u32

  saw: StaticArray<StaticArray<f32>>
  ramp: StaticArray<StaticArray<f32>>
  sqr: StaticArray<StaticArray<f32>>
  tri: StaticArray<StaticArray<f32>>

  constructor(sampleRate: u32) {
    let topFreq: f64 = 10
    let maxHarms: u32 = u32(f64(sampleRate) / (3.0 * topFreq) + 0.5)
    const tableLength: u32 = nextPowerOfTwo(maxHarms) * 2 * ANTIALIAS_WAVETABLE_OVERSAMPLING
    const tableMask: u32 = (tableLength - 1) << 2
    const numOfTables: u32 = u32(Math.log2(f64(maxHarms)) + 1)

    // logi(tableLength)
    const saw = new StaticArray<StaticArray<f32>>(numOfTables)
    const ramp = new StaticArray<StaticArray<f32>>(numOfTables)
    const sqr = new StaticArray<StaticArray<f32>>(numOfTables)
    const tri = new StaticArray<StaticArray<f32>>(numOfTables)
    for (let i: u32 = 0; i < numOfTables; i++) {
      saw[i] = new StaticArray<f32>(tableLength)
      ramp[i] = new StaticArray<f32>(tableLength)
      sqr[i] = new StaticArray<f32>(tableLength)
      tri[i] = new StaticArray<f32>(tableLength)
    }

    const freqs = new StaticArray<f32>(numOfTables)
    const real = new StaticArray<f32>(tableLength)
    const imag = new StaticArray<f32>(tableLength)

    this.real = real
    this.imag = imag
    this.freqs = freqs

    this.saw = saw
    this.ramp = ramp
    this.sqr = sqr
    this.tri = tri

    this.sampleRate = sampleRate
    this.topFreq = topFreq
    this.maxHarms = maxHarms
    this.numOfTables = numOfTables
    this.tableLength = tableLength
    this.tableMask = tableMask
    this.stepShift = i32(Math.log2(f64(WAVETABLE_SIZE))) - i32(Math.log2(f64(this.tableLength)))

    this.makeTables(this.saw, Real.saw)
    this.makeTables(this.ramp, Real.ramp)
    this.makeTables(this.sqr, Real.sqr)
    this.makeTables(this.tri, Real.tri)
  }

  getTableIndex(hz: f32): u32 {
    let tableIndex: u32 = 0
    while (
      hz >= this.freqs[tableIndex]
      && tableIndex < this.numOfTables - 1
    ) {
      tableIndex = tableIndex + 1
    }
    return tableIndex
  }

  makeTables(target: StaticArray<StaticArray<f32>>, fn: (real: StaticArray<f32>, i: u32, j: u32) => void): void {
    let topFreq: f64 = this.topFreq
    let i: u32 = 0
    for (let harms: u32 = this.maxHarms; harms >= 1; harms >>= 1) {
      this.defineWaveform(harms, fn)
      this.makeWavetable(target[i])
      this.freqs[i] = f32(topFreq)
      topFreq = topFreq * 2
      i = i + 1
    }
  }

  defineWaveform(harms: u32, fn: (real: StaticArray<f32>, i: u32, j: u32) => void): void {
    if (harms > (this.tableLength >> 1)) {
      harms = (this.tableLength >> 1)
    }

    this.imag.fill(0)
    this.real.fill(0)

    Real.sign = 1.0
    for (let i: u32 = 1, j: u32 = this.tableLength - 1; i <= harms; i++, j--) {
      fn(this.real, i, j)
    }
  }

  writeSaw(i: u32, j: u32): void {
    const temp: f32 = -1.0 / f32(i)
    this.real[i] = temp
    this.real[j] = -temp
  }

  makeWavetable(wave: StaticArray<f32>): void {
    fft(this.tableLength, this.real, this.imag)

    // calc normal
    let scale: f32
    let max: f32 = 0.0
    for (let i: u32 = 0; i < this.tableLength; i++) {
      let temp: f32 = Mathf.abs(this.imag[i])
      if (max < temp) max = temp
    }
    scale = 1.0 / max * 0.999

    for (let idx: u32 = 0; idx < this.tableLength; idx++) {
      wave[idx] = this.imag[idx] * scale
    }
  }
}
