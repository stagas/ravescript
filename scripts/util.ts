import fs from 'fs'

export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

export function writeIfNotEqual(filename: string, text: string): void {
  let existingText = ''

  try {
    existingText = fs.readFileSync(filename, 'utf-8')
  }
  catch (e) {
    const error: NodeJS.ErrnoException = e as any
    if (error.code !== 'ENOENT') {
      throw error
    }
  }

  if (existingText !== text) {
    fs.writeFileSync(filename, text, 'utf-8')
    console.log(`File "${filename}" ${existingText ? 'updated' : 'created'}.`)
  }
}
