export function Label({ text, children }: { text: string, children?: any }) {
  return <label class="flex flex-wrap sm:flex-nowrap sm:gap-2 items-center">
    <span class="w-[50%] whitespace-nowrap">
      {text}
    </span>
    {children}
  </label>
}
