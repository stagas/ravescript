import { cleanup, hmr, mount } from 'sigui'
import { App } from '~/src/pages/App.tsx'
import { setState, state } from '~/src/state.ts'

export const start = mount('#container', target => {
  state.container = target
  target.replaceChildren(<App /> as HTMLElement)
  return cleanup
})

if (import.meta.hot) {
  import.meta.hot.accept(hmr(start, state, setState))
}
else {
  start()
}
