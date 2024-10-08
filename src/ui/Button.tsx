export function Button(props: Record<string, string | boolean | Function>) {
  return <button
    class="rounded-sm font-bold text-sm py-1 px-4 tracking-wide"
    {...props}
  >
    {props.children}
  </button>
}
