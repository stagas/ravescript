import { Layout } from 'ui'

export function Header({ children }: { children?: any }) {
  return <header class="bg-black sticky top-0 left-0 z-50 h-[60px] w-full">
    <Layout>
      <div class="p-1.5 flex items-center justify-between">
        {children}
      </div>
    </Layout>
  </header>
}
