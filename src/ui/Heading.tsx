export function H1({ children }: { children?: any }) {
  return <h1 class="flex items-center mb-5">
    {children}
  </h1>
}

export function H2({ children }: { children?: any }) {
  return <h2 class="flex items-center border-b border-b-neutral-500 mb-2">
    {children}
  </h2>
}

export function H3({ children }: { children?: any }) {
  return <h3 class="min-h-9 flex items-center border-b border-neutral-600 justify-between mb-1">
    {children}
  </h3>
}
