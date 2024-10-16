class Vm {
  // <POOL>
  run(ops: StaticArray<i32>): void {
    // <LOCALS>
    let i: i32 = 0
    let op: i32
    while (op = ops[i++]) {
      switch (op) {
        // <OPS>
      } // end switch
    } // end while
  }
}

export function createVm(): Vm {
  const vm: Vm = new Vm()
  return vm
}
