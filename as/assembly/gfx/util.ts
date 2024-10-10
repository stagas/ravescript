
export function lineIntersectsRect(
  x0: f32, y0: f32, x1: f32, y1: f32,
  rectX: f32, rectY: f32, rectWidth: f32, rectHeight: f32
): boolean {
  const minX: f32 = Mathf.min(x0, x1)
  const minY: f32 = Mathf.min(y0, y1)
  const maxX: f32 = Mathf.max(x0, x1)
  const maxY: f32 = Mathf.max(y0, y1)

  if (maxX < rectX || minX > rectX + rectWidth || maxY < rectY || minY > rectY + rectHeight) {
    return false
  }

  return true
}
