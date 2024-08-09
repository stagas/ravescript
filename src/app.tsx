import { cleanup, hmr, mount } from 'signal-jsx'
import { Main } from './comp/Main.tsx'
import { replaceState, state } from './state.ts'

export const start = mount('#container', target => {
  target.replaceChildren(<Main /> as Element)
  return cleanup
})

if (import.meta.hot) {
  import.meta.hot.accept(hmr(start, state, replaceState))
}
else {
  start()
}
