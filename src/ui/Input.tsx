import { Sigui, type Signal } from 'sigui'
import { cn } from '~/lib/cn.ts'

export function Input(props: Record<string, string | boolean | Function>) {
  return <input
    class={cn(
      'w-full sm:w-auto placeholder:italic placeholder:text-neutral-500',
      props.class ?? ''
    )}
    {...props}
  />
}
