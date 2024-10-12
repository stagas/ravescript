export function parseWords(regexp: RegExp, text: string) {
  regexp.lastIndex = 0
  let word
  const words: RegExpExecArray[] = []
  while ((word = regexp.exec(text))) words.push(word)
  return words
}
