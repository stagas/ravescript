// KEEP: required for AssemblyScript interop.
globalThis.unmanaged = () => {
  // noop
  setTimeout(() => { }, 1)
}
