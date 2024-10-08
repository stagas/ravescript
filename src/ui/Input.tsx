export function Input(props: Record<string, string | boolean>) {
  return <input
    class="w-full sm:w-auto placeholder:italic placeholder:text-neutral-500"
    {...props}
  />
}
