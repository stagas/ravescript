import { cn } from '~/lib/cn.ts'

export function Button(props: Record<string, string | boolean | Function>) {
  return <button
    class={cn('rounded-sm font-bold text-sm py-1 px-4 tracking-wide', props.class)}
    {...props}
  >
    {props.children}
  </button>
}
