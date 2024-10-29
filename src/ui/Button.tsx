import { cn } from '~/lib/cn.ts'

export function Button(props: Record<string, string | boolean | Function> & { bare?: boolean }) {
  return <button
    {...props}
    class={cn(
      {
        [`font-bold rounded-sm tracking-wide text-sm py-1 px-4 min-h-8 bg-neutral-700 cursor-default border-2 border-neutral-500 border-b-neutral-800
          border-r-neutral-800 hover:border-neutral-400 hover:border-b-neutral-600
          hover:border-r-neutral-600 hover:active:border-neutral-500
          hover:active:border-t-neutral-700 hover:active:border-l-neutral-700`]: () => !props.bare
      },
      { 'cursor-pointer text-base bg-transparent border-none': () => props.bare },
      props.class,
    )}
  >
    {props.children}
  </button>
}
