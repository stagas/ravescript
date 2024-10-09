import { dispose } from 'sigui'

export function CachingRouter(routes: Record<string, () => JSX.Element>) {
  const cache = new Map<string, JSX.Element & { focus?(): void }>()
  let shouldDispose = false
  return function (pathname: string) {
    if (shouldDispose) {
      dispose()
      shouldDispose = false
    }
    if (('!' + pathname) in routes) {
      shouldDispose = true
      return routes['!' + pathname]()
    }
    if (!(pathname in routes)) return
    let el = cache.get(pathname)
    if (!el) cache.set(pathname, el = routes[pathname]())
    else requestAnimationFrame(() => el!.focus?.())
    return el
  }
}
