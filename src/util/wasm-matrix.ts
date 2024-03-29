import wasm from 'assembly-gfx'
import { Signal } from 'signal-jsx'
import { Matrix, Rect } from 'std'
import { log } from '../state.ts'

const DEBUG = false

export type WasmMatrix = ReturnType<typeof WasmMatrix>

export function WasmMatrix(view: Rect, matrix: Matrix) {
  using $ = Signal()

  const mat2d = new Float64Array(wasm.memory.buffer, wasm.createMatrix(), 6)

  $.fx(() => {
    const { a, d, e, f } = matrix
    const { pr, h } = view
    $()
    mat2d.set(matrix.values)
    DEBUG && log(a)
  })

  return mat2d
}
