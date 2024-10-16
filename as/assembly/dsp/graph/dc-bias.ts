import { logf } from '../../env'

export function dcBias(
  begin: u32,
  end: u32,
  block: usize,
): void {
  const length: u32 = end - begin
  let sample: f32 = 0
  let prev: f32 = 0
  let diff: f32 = 0
  let abs: f32 = 0
  const threshold: f32 = 0.6
  let alpha: f32 = 0

  let i: u32 = begin
  end = i + (length << 2)

  const offset = begin << 2
  block += offset

  for (; i < end; i += 16) {
    unroll(16, () => {
      sample = f32.load(block)
      // logf(sample)
      diff = sample - prev
      abs = Mathf.abs(diff)
      if (abs > threshold) {
        alpha = (threshold - abs) / threshold
        if (alpha > 1) alpha = 1
        else if (alpha < 0) alpha = 0
        prev = sample
        sample = prev + alpha * diff
        // logf(sample)
        f32.store(block, sample)
      }
      else {
        prev = sample
      }
      block += 4
    })
  }
}
