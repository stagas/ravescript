export function Header({ children }: { children?: any }) {
  return <header class="h-11 p-3.5 bg-black flex items-center justify-between">
    {children}
  </header>
}
