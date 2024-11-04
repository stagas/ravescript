import { $ } from 'sigui'
import { Help } from '~/src/comp/Help.tsx'
import { state } from '~/src/state.ts'

export function showHelpModal() {
  state.modalIsCancelled = false

  const off = $.fx(() => {
    const { modalIsCancelled } = state
    if (modalIsCancelled) {
      off()
      return
    }
    const { user } = state
    $()
    if (user == null) {
      state.modal = <Help />
      state.modalIsOpen = true
      state.modalIsCancelled = false
    }
    else {
      state.modal = null
      state.modalIsOpen = false
      queueMicrotask(() => off())
    }
  })
}
