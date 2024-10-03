export async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`Fetch error ${res.status}`)
  }
  return res.json()
}
