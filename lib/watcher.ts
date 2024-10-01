const es = new EventSource(import.meta.env.VITE_API_URL + '/watcher')
es.onopen = () => es.onopen = () => (location.href = location.href)
