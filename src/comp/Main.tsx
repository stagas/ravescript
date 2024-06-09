import { Signal } from 'signal-jsx'
import { lib } from '../lib.ts'
import { screen } from '../screen.tsx'
import { services } from '../services.ts'
import { state } from '../state.ts'
import { Bench, BenchResults } from './Bench.tsx'
import { Console } from './Console.tsx'
import { Navbar } from './Navbar.tsx'
import { Sequencer } from './Sequencer.tsx'
import { dom } from 'utils'

const DEBUG = true

export function Main() {
  DEBUG && console.log('[main] create')
  using $ = Signal()

  const sidebar = <aside />
  const article = <article />

  // const bench = Bench()

  // bench.add('Math.sin()', () => {
  //   let i = 0
  //   let x = 0
  //   return () => {
  //     x += Math.sin(i++ / 10000)
  //   }
  // }, { times: 100_000, raf: true })

  $.fx(() => () => {
    // TODO: player.dispose()
    services.audio.player.stop()
  })

  lib.boot()

  const sequencer = Sequencer()

  $.fx(() => {
    const { path } = state
    $()
    sidebar.replaceChildren((() => {
      switch (path) {
        case '/bench':
          return <div />

        default:
          return <div>
            {sequencer.code.canvas}
            {sequencer.code.textarea}
          </div>
      }
    })())

    article.replaceChildren((() => {
      switch (path) {
        case '/bench':
          sequencer.minimap?.el.remove()
          return <BenchResults />

        default:
          return sequencer.el
      }
    })())
  })

  $.fx(() => () => {
    DEBUG && console.log('[main] dispose')
  })

  const navbar = <Navbar sequencer={sequencer} />

  return <main data-theme={() => screen.info.theme} class="mono bg-base-100 h-full w-full">
    {navbar}
    {sidebar}
    {article}
    {DEBUG && <Console
      signal={() => state.debugUpdated}
      history={state.debugHistory}
      size={45}
    />}
  </main>
}
