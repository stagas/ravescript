import { Sigui } from 'sigui'
import type { Matrix, Rect } from '~/src/as/gfx/types.ts'
import wasm from '~/src/as/gfx/wasm.ts'

const DEBUG = false

export type WasmMatrix = ReturnType<typeof WasmMatrix>

export function WasmMatrix(view: Rect, matrix: Matrix) {
  using $ = Sigui()

  const mat2d = new Float64Array(wasm.memory.buffer, wasm.createMatrix(), 6)

  $.fx(() => {
    const { a, d, e, f } = matrix
    const { pr, h } = view
    $()
    mat2d.set(matrix.values)
    DEBUG && console.log(a)
  })

  return mat2d
}
