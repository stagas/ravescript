import { cn } from '~/lib/cn.ts'
import type { Anim } from '~/src/as/gfx/anim.ts'
import { state } from '~/src/state.ts'
import { Button } from '~/src/ui/Button.tsx'

export function AnimMode({ anim }: { anim: Anim }) {
  return <div class="flex items-center self-start gap-2">
    <span>anim:</span>
    <Button onclick={() => state.animCycle?.()} class="flex flex-row items-center justify-between gap-1">
      {() => <div class={cn(
        'rounded-[100%] w-2 h-2',
        { 'bg-green-500': anim.info.isRunning },
        { 'bg-neutral-500': !anim.info.isRunning },
      )} />}
      <div class="w-12">{() => state.animMode}</div>
    </Button>
  </div>
}
