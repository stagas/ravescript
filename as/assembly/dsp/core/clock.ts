@unmanaged
export class Clock {
  time: f64 = 0
  timeStep: f64 = 0
  prevTime: f64 = -1
  startTime: f64 = 0
  endTime: f64 = 1
  bpm: f64 = 60
  coeff: f64 = 0
  barTime: f64 = 0
  barTimeStep: f64 = 0
  loopStart: f64 = -Infinity
  loopEnd: f64 = +Infinity
  sampleRate: u32 = 44100
  jumpBar: i32 = -1
  ringPos: u32 = 0
  nextRingPos: u32 = 0

  reset(): void {
    const c: Clock = this
    c.ringPos = 0
    c.nextRingPos = 0
    c.prevTime = -1
    c.time = 0
    c.barTime = c.startTime
  }
  update(): void {
    const c: Clock = this

    c.coeff = c.bpm / 60 / 4
    c.timeStep = 1.0 / c.sampleRate
    c.barTimeStep = c.timeStep * c.coeff

    let bt: f64

    // advance barTime
    bt = c.barTime + (
      c.prevTime >= 0
        ? (c.time - c.prevTime) * c.coeff
        : 0
    )
    c.prevTime = c.time

    // wrap barTime on clock.endTime
    const startTime = Math.max(c.loopStart, c.startTime)
    const endTime = Math.min(c.loopEnd, c.endTime)

    if (bt >= endTime) {
      bt = startTime + (bt % 1.0)
    }

    c.barTime = bt
  }
}
