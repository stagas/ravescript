import { Linecol, type Caret, type Selection, type View } from 'editor'
import { Sigui } from 'sigui'
import { assign, dom, MouseButtons } from 'utils'

export type Mouse = ReturnType<typeof Mouse>

export function Mouse({ selection, caret, view }: {
  selection: Selection
  caret: Caret
  view: View
}) {
  using $ = Sigui()

  const info = $({
    isDown: false,
    buttons: 0,
    count: 0,
    x: 0,
    y: 0,
    linecol: $(Linecol()),
  })

  function updateFromEvent(ev: PointerEvent | Touch) {
    const c = view.el.getBoundingClientRect()
    info.x = ev.pageX - c.left
    info.y = ev.pageY - c.top
    assign(info.linecol, view.linecolFromViewPoint(info))
  }

  const COUNT_TIMEOUT = 350
  let countTimeout: any

  $.fx(() => [
    dom.on(view.el, 'contextmenu', dom.prevent.stop),
    dom.on(view.el, 'pointerdown', $.fn((ev: PointerEvent) => {
      ev.preventDefault()
      updateFromEvent(ev)

      info.buttons = ev.buttons

      if (info.buttons & MouseButtons.Middle) {
        // TODO: implement middle click
        return
      }

      if (info.buttons & MouseButtons.Right) {
        // TODO: implement right click
        return
      }

      info.isDown = true

      clearTimeout(countTimeout)
      countTimeout = setTimeout(() => info.count = 0, COUNT_TIMEOUT)
      info.count++

      switch (info.count) {
        case 1: {
          selection.reset()
          Object.assign(caret, info.linecol)
          caret.visualXIntent = caret.col
          $.flush()
          selection.reset()
          break
        }
        case 2: {
          selection.selectWord()
          break
        }
        case 3: {
          selection.selectBlock()
          break
        }
        case 4: {
          selection.selectLine()
          break
        }
        default: {
          selection.reset()
          info.count = 0
          break
        }
      }
      caret.info.isBlink = false
    })),
    dom.on(window, 'pointerup', $.fn((ev: PointerEvent) => {
      updateFromEvent(ev)
      info.isDown = false
      info.buttons = 0

      caret.info.isBlink = true
    })),
    dom.on(window, 'pointermove', $.fn((ev: PointerEvent) => {
      updateFromEvent(ev)

      if (info.buttons & MouseButtons.Left) {
        Object.assign(caret, info.linecol)
        $.flush()
        selection.toCaret()
      }
    })),
  ])

  return { info }
}
