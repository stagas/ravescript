import { App } from '../pages/App.tsx'
import { state } from '../state.ts'

// @ts-ignore
globalThis.fetch = () => {
  return { json: () => { } }
}

describe('App', () => {
  it('works', () => {
    const app = <App />
    expect(app).toBeInstanceOf(Element)
  })

  it('routes', async () => {
    const app = <App />
    expect(app).toBeInstanceOf(Element)
    state.url = new URL('/about', location.origin)
    state.url = new URL('/verify-email', location.origin)
    state.url = new URL('/reset-password', location.origin)
  })

  it('user', async () => {
    const app = <App />
    expect(app).toBeInstanceOf(Element)
    state.user = null
    state.user = {
      nick: 'foo',
      expires: new Date(),
    }
    state.user = {
      nick: 'foo',
      expires: new Date(),
      isAdmin: true
    }
  })
})
