import { state } from '../state.ts'

export function go(href: string) {
  history.pushState({}, '', href)
  state.url = new URL(location.href)
}

export function Link({ href, children }: { href: string, children?: any }) {
  return <a href="#" onclick={ev => {
    ev.preventDefault()
    go(href)
  }}>{children}</a>
}
