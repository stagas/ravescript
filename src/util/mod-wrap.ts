export function modWrap(x: number, N: number): number {
  return (x % N + N) % N
}
