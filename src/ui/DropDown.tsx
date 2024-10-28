import { Sigui } from 'sigui'
import { dom } from 'utils'
import { cn } from '~/lib/cn.ts'

type Items = ([any, () => void] | [any])[]

export function DropDown({ right, handle, items }: { right?: boolean, handle: JSX.Element | string, items: Items | (() => Items) }) {
  using $ = Sigui()

  const info = $({ isOpen: false })

  const dropDown = <div class="relative inline-block z-50">
    <div class={cn('select-none cursor-pointer p-0.5 flex items-center justify-center', { 'bg-neutral-800': () => info.isOpen })} onpointerdown={e => {
      e.preventDefault()
      info.isOpen = !info.isOpen
    }}>
      {handle}
    </div>
    {() => <div class={cn('absolute whitespace-nowrap bg-neutral-800 cursor-default flex flex-col', { 'hidden': () => !info.isOpen, 'right-0': () => right })}>
      {(typeof items === 'function' ? items() : items).map(([item, fn], i) => <div key={i} class="hover:bg-neutral-700 flex flex-col" onclick={e => {
        fn?.()
        info.isOpen = false
      }}>
        {item}
      </div>)}
    </div>}
  </div> as HTMLDivElement

  $.fx(() => {
    const { isOpen } = info
    $()
    if (isOpen) {
      return [
        dom.on(window, 'keydown', e => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            info.isOpen = false
          }
        }),
        dom.on(window, 'pointerdown', e => {
          if (e.composedPath().includes(dropDown)) {
            return
          }
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          info.isOpen = false
          dom.on(window, 'click', e => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
          }, { once: true, capture: true })
        }, { capture: true }),
      ]
    }
  })

  return dropDown
}
