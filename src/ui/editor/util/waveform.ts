const waveformLength = 2048

export function makeWaveform(length: number, startTime: number, frequency: number) {
  return Float32Array.from({ length }, (_, i) =>
    Math.sin(((i + startTime) / length) * Math.PI * 2 * frequency)
  )
}

export const waveform = makeWaveform(2048, 0, 1)
