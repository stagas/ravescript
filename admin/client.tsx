import { cleanup, hmr, mount } from 'sigui'
import { Admin } from '~/admin/Admin.tsx'
import { setState, state } from '~/src/state.ts'

export const start = mount('#container', target => {
  target.replaceChildren(<Admin />)
  return cleanup
})

if (import.meta.hot) {
  import.meta.hot.accept(hmr(start, state, setState))
}
else {
  start()
}
