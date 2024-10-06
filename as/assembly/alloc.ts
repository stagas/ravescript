export function heap_alloc(size: usize): usize {
  return heap.alloc(size)
}

export function heap_free(ptr: usize): void {
  heap.free(ptr)
}

export function allocI32(length: i32): usize {
  return changetype<usize>(new StaticArray<i32>(length))
}

export function allocU32(length: i32): usize {
  return changetype<usize>(new StaticArray<u32>(length))
}

export function allocF32(length: i32): usize {
  return changetype<usize>(new StaticArray<f32>(length))
}
