const SocketReadyState = {
  '-1': 'inactive',
  '0': 'connecting',
  '1': 'open',
  '2': 'closing',
  '3': 'closed'
} as const

export function createWebSocket(pathname: string, host?: string): typeof ws {
  const reconnect = delay(connect, 1000)

  const ws = {
    host: (host || ('ws' + location.origin.split('http').pop())) + pathname,
    state,
    close,
    onopen: reconnect,
    onclose: reconnect,
    onerror: (_ev: Event): void => void 0,
    onmessage: (_message: MessageEvent): void => void 0,
    socket: null as null | WebSocket,
    send: (_data: string | Blob | ArrayBufferView | ArrayBufferLike): void => void 0
  }

  connect()

  return ws

  function connect() {
    if ('closed' == ws.state()) ws.socket = null
    if ('inactive' != ws.state()) return

    let socket: WebSocket
    try {
      socket = new WebSocket(ws.host)
    }
    catch (err) {
      return setTimeout(function () {
        ws.onerror(err as any)
      }, 0)
    }

    socket.onmessage = onmessage
    socket.onopen = onopen
    socket.onclose = onclose
    socket.onerror = onerror

    ws.socket = socket
    ws.send = socket.send.bind(socket)
  }

  function state(this: typeof ws) {
    if (!this.socket) return 'inactive'
    return SocketReadyState[
      this.socket
        ? this.socket.readyState as -1 | 0 | 1 | 2 | 3
        : -1
    ]
  }

  function close(this: typeof ws, re?: boolean) {
    if (re) {
      this.onerror = this.onclose = reconnect
    }
    else {
      this.onclose = this.onerror = () => { }
    }

    this.socket?.close()
  }

  function onmessage(message: MessageEvent) { ws.onmessage(message) }
  function onopen() { ws.onopen() }
  function onclose() { ws.onclose() }
  function onerror(e: Event) { ws.onerror(e) }
}

function delay(fn: () => void, ms: number) {
  return function () {
    setTimeout(fn, ms)
  }
}
