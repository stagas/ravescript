export function Header({ children }: { children?: any }) {
  return <header class="h-11 p-3.5 bg-black flex items-center justify-between sticky top-0 left-0">
    {children}
  </header>
}
