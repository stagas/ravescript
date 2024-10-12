import { Buffer, Caret, Selection } from 'editor'
import { Sigui } from 'sigui'
import { assign, debounce } from 'utils'

const DEBUG = true

interface Snap {
  buffer: {
    code: string
  }
  caret: {
    index: number
    visualXIntent: number
  }
  selection: {
    startIndex: number
    endIndex: number
  }
}

export type History = ReturnType<typeof History>

export function History({ selection, buffer, caret }: {
  selection: Selection
  buffer: Buffer
  caret: Caret
}) {
  using $ = Sigui()

  const info = $({
    needle: 0,
    snaps: [Snap()],
    get current() {
      return info.snaps[info.needle]
    }
  })

  function Snap(): Snap {
    return {
      buffer: {
        code: buffer.code,
      },
      caret: {
        index: caret.index,
        visualXIntent: caret.visualXIntent,
      },
      selection: {
        startIndex: selection.startIndex,
        endIndex: selection.endIndex,
      }
    }
  }

  function save() {
    const snap = Snap()

    // merge
    if (info.current.buffer.code === snap.buffer.code) {
      DEBUG && console.debug('[hist] merge:', info.needle + 1, '/', info.snaps.length)
      assign(info.current.caret, snap.caret)
      assign(info.current.selection, snap.selection)
      return
    }

    // discard rest
    if (info.needle < info.snaps.length - 1) {
      info.snaps = info.snaps.slice(0, info.needle + 1)
    }

    // save
    info.snaps.push(snap)
    info.needle++
    DEBUG && console.debug('[hist] save:', info.needle + 1, '/', info.snaps.length)
  }

  const saveDebounced = debounce(300, save, { first: true, last: true })

  function restore() {
    const snap = info.snaps[info.needle]
    assign(buffer, snap.buffer)
    assign(caret, snap.caret)
    assign(selection, snap.selection)
  }

  function withHistory(fn: () => void) {
    $.flush()
    save()
    fn()
    $.flush()
    save()
  }

  function withHistoryDebounced(fn: () => void) {
    $.flush()
    saveDebounced()
    fn()
    $.flush()
    saveDebounced()
  }

  function undo() {
    if (info.needle > 0) {
      info.needle--
      restore()
    }
    DEBUG && console.debug('[hist] undo:', info.needle + 1, '/', info.snaps.length)
  }

  function redo() {
    if (info.needle < info.snaps.length - 1) {
      info.needle++
      restore()
    }
    DEBUG && console.debug('[hist] redo:', info.needle + 1, '/', info.snaps.length)
  }

  return {
    save,
    saveDebounced,
    withHistory,
    withHistoryDebounced,
    undo,
    redo
  }
}
