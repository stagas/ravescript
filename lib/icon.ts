import { createElement, type IconNode } from 'lucide'

export function icon(i: IconNode, p: Record<string, string | number> = { size: 16 }) {
  const svg = createElement(i)
  p.width = p.height = p.size
  for (const k in p) {
    svg.setAttribute(k, `${p[k]}`)
  }
  return svg
}
