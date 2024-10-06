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

export function Link({
  href = '#',
  onclick = go,
  children
}: {
  href?: string | (() => string),
  onclick?: (href: string) => unknown,
  children?: any
}) {
  return <a href={href} onclick={ev => {
    ev.preventDefault()
    onclick(typeof href === 'function' ? href() : href)
  }}>{children}</a>
}
