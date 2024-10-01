import type { z } from 'zod'

export function parseForm<T extends z.AnyZodObject>(el: HTMLFormElement, schema: T) {
  const form = new FormData(el)
  const data = Object.fromEntries(form.entries())
  return schema.parse(data) as z.infer<T>
}
