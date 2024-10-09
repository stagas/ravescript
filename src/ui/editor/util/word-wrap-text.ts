export interface Line {
  text: string
  hasBreak: boolean
}

export function wordWrapText(lines: string[], width: number): Line[] {
  const text = lines.join('\n')
  const cut = true
  const br = '\n'

  if (0 === width || text.length <= width) {
    return [{ text, hasBreak: false }]
  }

  return text.split('\n').flatMap((line, index, array) => {
    const hasBreak = index < array.length - 1

    if (line.length <= width) {
      return [{ text: line, hasBreak }]
    }

    let words = line.split(' ')

    if (cut) {
      let temp = []
      for (const word of words) {
        if (word.length > width) {
          let i = 0
          const length = word.length
          while (i < length) {
            temp.push(word.slice(i, Math.min(i + width, length)))
            i += width
          }
        } else {
          temp.push(word)
        }
      }
      words = temp
    }

    let wrapped = words.shift()!
    let spaceLeft = width - wrapped.length
    let result: Line[] = []
    let currentLine = wrapped

    for (const word of words) {
      if (word.length + 1 > spaceLeft) {
        result.push({ text: currentLine, hasBreak: false })
        currentLine = word
        spaceLeft = width - word.length
      } else {
        currentLine += ' ' + word
        spaceLeft -= 1 + word.length
      }
    }

    result.push({ text: currentLine, hasBreak })
    return result
  })
}
