export function parseWords(regexp: RegExp, text: any) {
  regexp.lastIndex = 0
  let word
  const words: RegExpExecArray[] = []
  while ((word = regexp.exec(text))) words.push(word)
  return words
}
