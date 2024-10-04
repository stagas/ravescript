export function Input(props: Record<string, string | boolean>) {
  return <input
    class="w-full sm:w-auto"
    {...props}
  />
}
