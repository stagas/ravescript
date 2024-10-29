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
  class: _class = '',
  title,
  style,
  onclick = go,
  children
}: {
  href?: string | (() => string)
  class?: string | (() => string)
  title?: string
  style?: any
  onclick?: (href: string) => unknown
  children?: any
}) {
  return <a href={href} class={_class} title={title} style={style} onclick={ev => {
    ev.preventDefault()
    onclick(typeof href === 'function' ? href() : href)
  }}>{children}</a>
}
