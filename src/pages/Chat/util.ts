import { state } from '~/src/state.ts'

export function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name)
}

export function byNick(a: { nick: string }, b: { nick: string }) {
  return a.nick.localeCompare(b.nick)
}

export function colorizeNick(nick: string = '') {
  const hash = [...nick].reduce((acc, char) => char.charCodeAt(0) + acc, 0)
  const hue = hash % 360
  return `hsl(${hue}, 60%, 55%)`
}

export function hasChannel(channelName: string) {
  return state.channelsList.find(c => c.name === channelName)
}
