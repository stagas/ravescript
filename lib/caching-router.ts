export function CachingRouter(routes: Record<string, () => JSX.Element>) {
  const cache = new Map<string, JSX.Element>()
  return function (pathname: string) {
    if (!(pathname in routes)) return
    let el = cache.get(pathname)
    if (!el) cache.set(pathname, el = routes[pathname]())
    return el
  }
}
