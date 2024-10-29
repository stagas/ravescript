export function Label({ text, children }: { text: string, children?: any }) {
  return <label class="flex flex-wrap sm:flex-nowrap sm:gap-2 items-center justify-center">
    <span class="w-full whitespace-nowrap">
      {text}
    </span>
    <span class="w-full">
      {children}
    </span>
  </label>
}
