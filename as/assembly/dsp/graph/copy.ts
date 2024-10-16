export function copyMem(
  inp: usize,
  out: usize,
  size: usize
): void {
  memory.copy(out, inp, size)

  // let inpv: v128

  // let i: u32 = 0
  // length = length << 2

  // for (; i < length; i += 64) {
  //   unroll(16, () => {
  //     inpv = v128.load(inp)
  //     v128.store(out, inpv)
  //     inp += 16
  //     out += 16
  //   })
  // }
}

export function copyInto(
  begin: u32,
  end: u32,
  inp: usize,
  out: usize,
): void {
  const size: usize = (end - begin) << 2
  const offset: usize = begin << 2
  memory.copy(
    out + offset,
    inp + offset,
    size
  )
}

export function copyAt(
  begin: u32,
  end: u32,
  inp: usize,
  out: usize,
): void {
  const size: usize = (end - begin) << 2
  const offset: usize = begin << 2
  memory.copy(
    out,
    inp + offset,
    size
  )
}

// export function copyInto(
//   begin: u32,
//   end: u32,
//   inp: usize,
//   out: usize,
// ): void {
//   let inpv: v128

//   let i: u32 = begin

//   const offset = begin << 2
//   inp += offset
//   out += offset

//   for (; i < end; i += 64) {
//     unroll(16, () => {
//       inpv = v128.load(inp)
//       v128.store(out, inpv)
//       inp += 16
//       out += 16
//     })
//   }
// }
