import 'https://deno.land/x/websocket_broadcastchannel@0.8.0/polyfill.ts'

export function createBus(keys: readonly string[]) {
  const bc = new BroadcastChannel(keys.join(':'))

  const api = {
    postMessage(data: unknown) {
      bc.postMessage(JSON.stringify(data))
    },
    set onmessage(fn: (ev: MessageEvent) => void) {
      bc.onmessage = ev => {
        fn({
          data: JSON.parse(ev.data),
          origin: ev.origin,
          lastEventId: ev.lastEventId,
          source: ev.source,
        } as MessageEvent)
      }
    },
    set onmessageerror(fn: (error: MessageEvent) => void) {
      bc.onmessageerror = fn
    }
  } as BroadcastChannel

  return api
}
