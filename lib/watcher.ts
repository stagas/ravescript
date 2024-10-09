if (import.meta.env.DEV) {
  const url = location.origin.includes('devito')
    ? import.meta.env.VITE_API_URL + '/watcher'
    : Object.assign(new URL(location.origin), { port: 8000 }).href + 'watcher'
  const es = new EventSource(url)
  es.onopen = () => es.onopen = () => (location.href = location.href)
}
