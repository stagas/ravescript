export function beginOfLine(line: string) {
  return line.match(/[^\s]|$/m)!.index!
}
