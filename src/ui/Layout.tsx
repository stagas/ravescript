export function Layout({ children }: { children?: any }) {
  return <div class="flex flex-row items-center justify-center h-full">
    <div class="md:max-w-[980px] lg:max-w-[1080px] xl:max-w-[1240px] w-full">
      {children}
    </div>
  </div>
}
