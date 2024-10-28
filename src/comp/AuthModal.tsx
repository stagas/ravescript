import { $ } from 'sigui'
import { LoginOrRegister } from '~/src/comp/LoginOrRegister.tsx'
import { state } from '~/src/state.ts'

export function showAuthModal() {
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
      state.modal = <LoginOrRegister />
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

export function wrapActionAuth(fn: () => void) {
  return () => {
    if (state.user) return fn()

    showAuthModal()

    const off = $.fx(() => {
      const { modalIsCancelled } = state
      if (modalIsCancelled) {
        off()
        return
      }
      const { user, favorites } = $.of(state)
      $()
      fn()
      off()
    })
  }
}
