import { $ } from 'sigui'

export const link = $({
  url: new URL(location.href)
})

window.onpopstate = () => {
  link.url = new URL(location.href)
}

export function go(href: string) {
  history.pushState({}, '', href)
  link.url = new URL(location.href)
}

export function Link({ href, children }: { href: string, children?: any }) {
  return <a href="#" onclick={ev => {
    ev.preventDefault()
    go(href)
  }}>{children}</a>
}
