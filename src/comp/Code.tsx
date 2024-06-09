import { Signal } from 'signal-jsx'
import { Point, Rect } from 'std'
import { clamp, dom, isMobile } from 'utils'
import { CODE_WIDTH } from '../constants.ts'
import { Editor, createEditor } from '../editor/editor.ts'
import { Keyboard } from '../editor/keyboard.ts'
import { Pointer, PointerEventType } from '../editor/pointer.ts'
import { Token } from '../lang/tokenize.ts'
import { layout } from '../layout.ts'
import { lib } from '../lib.ts'
import { screen } from '../screen.tsx'
import { state } from '../state.ts'
import { toHex } from '../util/rgb.ts'
import { Canvas } from './Canvas.tsx'
import { dspGens } from '../../generated/typescript/dsp-gens.ts'

export function Code(view: Rect) {
  using $ = Signal()

  const info = $({
    redraw: 0,

    focusedEditor: null as Editor | null,

    font: 'Mono',
    textLeft: 20,
    textTop: 12,

    fontSize: '14px',
    lineHeight: 16,
  })

  const editorView = $(new Rect)
  $.fx(() => {
    const { codeWidth, codeHeight } = layout.info
    const { pr } = screen.info
    $()
    editorView.w = codeWidth * pr
    editorView.h = codeHeight * pr
  })


  // const AstNodeColors = {
  //   [AstNode.Type.Id]: '#888',
  // } as any

  let metrics: any

  const sparePoint = $(new Point)

  // const view = $(new Rect, { pr: screen.info.$.pr, y: 44, w: CODE_WIDTH, h: window.innerHeight - 44 })

  function onresize() {
    info.redraw++
  }

  const canvas = <Canvas actual view={view} onresize={onresize} class="absolute left-0 z-40" /> as Canvas
  $.fx(() => {
    const { y } = view
    $()
    canvas.style.transform = `translateY(${view.y}px)`
  })
  const c = canvas.getContext('2d', { alpha: true })!

  function drawSeparators() {
    c.save()
    for (const t of lib.project!.info.tracks) {
      c.lineWidth = screen.info.pr * 2
      c.beginPath()
      let y = t.info.sy
      c.moveTo(0, y)
      c.lineTo(CODE_WIDTH * screen.info.pr - 25, y)
      c.strokeStyle = t.info.colors.hexColor ?? '#fff'
      c.stroke()

      c.lineWidth = 2
      c.beginPath()
      y = t.info.sy - 2
      c.moveTo(0, y)
      c.lineTo(CODE_WIDTH * screen.info.pr - 25, y)
      c.strokeStyle = '#000'
      c.stroke()
    }
    c.restore()
  }

  //
  // big scrollbar
  //
  const bigScrollbarRect = $(new Rect)

  function drawBigScrollbar() {
    const m = state.viewMatrix
    c.save()
    c.scale(screen.info.pr, screen.info.pr)
    const vh = view.h

    const co = (vh / (m.d * 2 * (lib.project!.info.tracks.length)))

    const w = 30
    const x = view.w - (5 + w)
    let y = -.5 - m.f * co * 2
    const bottom = window.innerHeight - 47

    let h = vh * co * screen.info.pr

    if (y < 0) {
      h += y
      y = 0
    }

    if (y + h > bottom) h = bottom - y

    y += 1

    bigScrollbarRect.x = x
    bigScrollbarRect.y = 0
    bigScrollbarRect.w = w
    bigScrollbarRect.h = vh

    if (isHoveringBigScrollbar) {
      bigScrollbarRect.fill(c, screen.info.colors['base-content'] + '33')
    }

    c.beginPath()
    c.rect(x, y - 1, w, h + 1)
    c.fillStyle = screen.info.colors['base-content'] + '44'
    c.fill()
    for (const t of lib.project!.info.tracks) {
      c.beginPath()
      const h = (view.h / (lib.project!.info.tracks.length))
      const y = (t.info.y) * h
      // c.moveTo(x + 10, y)
      c.moveTo(x + 8 + w - 10, y)
      c.lineTo(x + 8 + w - 10, y + h - 1)
      c.lineWidth = 4
      c.strokeStyle = t.info.colors.hexColor ?? '#fff'
      c.stroke()
    }

    c.restore()
  }

  $.fx(() => {
    const { focusedEditor } = $.of(info)
    $()
    focusedEditor.misc.isFocused = true
    return () => {
      focusedEditor.misc.isFocused = false
    }
  })
  const keyboard = $(new Keyboard)
  const pointer = $(new Pointer)
  pointer.element = canvas
  // pointer.offset.y = 44

  let isHoveringBigScrollbar = false

  const target = {
    rect: bigScrollbarRect,
    handler: () => {
      const m = state.matrix

      if (pointer.type === PointerEventType.Down) {
        pointer.isDown = true

        const handle = (e: MouseEvent) => {
          e.stopImmediatePropagation()
          e.preventDefault()
          if (!lib.project) return
          const { tracks } = lib.project.info
          const th = (view.h / (tracks.length - 1)) //* m.d
          const n = clamp(0, 1.0, (e.pageY - 44 - th / 2) / (view.h - th))
          m.f = -n * (m.d * (tracks.length - 1))
          // const co = m.d / view.h * state.tracks.length
          // m.f = -Math.min( (((co * view.h) - view.h) / m.d) * 2 , n * (view.h / m.d) * 2)
          // console.log(m.f)
        }
        const off = dom.on(window, 'mousemove', handle, { capture: true })
        handle(pointer.real as any)
        dom.on(window, 'mouseup', () => {
          pointer.isDown = false
          off()
        }, { once: true })
      }
      else if (pointer.type === PointerEventType.Wheel) {
        m.f -= (pointer.real as any).deltaY * 0.001 * m.d
      }

      document.body.style.cursor = 'pointer'
    }
  }

  $.fx(() => {
    const { hoverTarget } = pointer
    $()
    if (hoverTarget === target) {
      isHoveringBigScrollbar = true
      info.redraw++
      return () => {
        document.body.style.cursor = ''
        isHoveringBigScrollbar = false
        queueMicrotask(() => {
          info.redraw++
        })
      }
    }
  })

  pointer.targets.add(target)
  // dom.on(window, 'mouseup', (e) => {
  //   if (e.currentTarget)
  //   keyboard.textarea.focus()
  // })
  keyboard.onKeyboardEvent = (kind: Keyboard.EventKind): Keyboard.Result => {
    // const widget = state.focusedPlayer

    // if (kind === Keyboard.EventKind.Down
    //   && keyboard.ctrl
    //   && keyboard.key?.value === 'Enter') {
    //   widget?.playToggle()
    //   return true
    // }

    // if (widget) {
    info.focusedEditor?.text.onKeyboardEvent(kind)
    // }
  }
  // keyboard.appendTo(dom.body)

  if (!isMobile()) {
    keyboard.textarea.focus()
    setTimeout(() => {
      keyboard.textarea.focus()
    }, 100)
  }

  function createEditorView(rect: Rect) {
    const editorInfo = $({
      rect,

      redraw: 0,

      brand: '#ff381f',
      brand2: '#6838ff',
      brand3: '#88ff88',

      get TokenColors() {
        return {
          [Token.Type.Op]: toHex(screen.info.colors['primary']),
          [Token.Type.Id]: this.brand,
          [Token.Type.Keyword]: this.brand2,
          [Token.Type.Number]: toHex(screen.info.colors['base-content']),
          [Token.Type.Comment]: toHex(screen.info.colors['base-content']) + '66',
        } as any
      },
      get Builtin() {
        return {
          sr: this.brand2,
          t: this.brand2,
          rt: this.brand2,
          co: this.brand2,
          ...Object.fromEntries(Object.keys(dspGens).map(key => [
            key, this.brand3,
          ]))
        } as any
      }
    })

    const editor = createEditor(rect, c, Token, keyboard, pointer)
    editor.dims.lineHeight = info.lineHeight
    editor.selection.colors.color = toHex(screen.info.colors['base-content']) + '66'

    editor.text.padding.setParameters(info.textLeft, info.textTop)

    // Pointer Target
    const targetRect = $(new Rect)

    const focusEvents = new Set([
      PointerEventType.Wheel,
      PointerEventType.Down,
      PointerEventType.Menu,
    ])
    const target = {
      rect: targetRect,
      handler: () => {
        // allow items to overlay the editor and not clickthrough events
        const targetTag = (pointer.real?.target as HTMLElement)?.tagName
        if (targetTag !== 'CANVAS') return

        if (pointer.type === PointerEventType.Down) {
          info.focusedEditor = editor
        }

        const metrics = editor.c.measureText('M')
        let charWidth = metrics.width

        editor.dims.charWidth = charWidth
        editor.dims.lineHeight = info.lineHeight
        if (editor.text.onMouseEvent(pointer.type)) {
          if (focusEvents.has(pointer.type)) {
            editor.keyboard.textarea.focus({ preventScroll: true })
          }
          // dom.stop.prevent(pointer.real!)
        }
      }
    }

    pointer.targets.add(target)
    $.fx(() => () => {
      pointer.targets.delete(target)
    })

    $.fx(() => {
      {
        const { x, y, w, h } = view
      }
      // {
      //   const { x, y, w, h } = editor.view
      // }
      const { pr } = screen.info
      $()
      // console.log(view.text)
      // console.log(editor.rect.text, editor.view.text, view.text)
      editor.rect.w = editor.view.w = view.w //* pr
      editor.rect.h = editor.view.h = view.h * pr - 50
      // editor.view.size.set(view.size).mul(screen.info.pr)
      targetRect.set(view) //editor.view)
      // targetRect.pos.div(screen.info.pr)
      // targetRect.y = 0 //targetRect.h
      // pointer.offset.y = targetRect.h
      editor.text.offset.y = view.y - 3 //targetRect.h + HEADER_HEIGHT - 3
    })

    // KEEP: resize to height
    // TODO: make it an option in Editor
    // $.fx(() => {
    //   const { lines } = $.of(editor.buffer)
    //   const { lineHeight } = $.of(editor.dims)
    //   $()
    //   editor.view.w = CODE_WIDTH * screen.info.pr
    //   editor.view.h = (lineHeight * lines.length + editor.text.padding.y * 2) * screen.info.pr
    // })
    // $.fx(() => dom.on(window, 'resize', $.fn(() => {
    //   $.untrack(() => {
    //   })
    // }), { passive: true, unsafeInitial: true }))

    $.fx(() => {
      const { source } = $.of(editor.buffer)
      const { code, tokens } = $.of(source)
      // const { tokensAstNode, error } = state
      // const { redraw } = info
      const { TokenColors, Builtin } = editorInfo
      const { colors } = screen.info
      const { w, h } = rect
      const { line, col } = editor.buffer
      const { x, y } = editor.scroll
      const { x: vx, y: vy } = editor.view
      const { isFocused } = editor.misc
      const { selection: {
        sorted: { top: { x: tx, y: ty },
          bottom: { x: bx, y: by } } } } = editor
      $()
      info.redraw++
    })

    // $.fx(() => {
    //   const { redraw } = editorInfo
    //   $()
    //   drawText()
    // })

    $.fx(() => {
      const { x, y } = editor.scroll.targetScroll
      $()
      editor.scroll.pos.setParameters(x, y)
    })

    function linecolToPos(t: { line: number, col: number }) {
      return sparePoint.setParameters(
        Math.round(t.col * metrics.width + info.textLeft),
        Math.round(t.line * info.lineHeight + info.textTop)
      )
    }

    function drawText() {
      if (!editor.buffer.source?.lines) return

      const c = editor.c
      c.textBaseline = 'top'
      c.textAlign = 'left'
      c.font = `${info.fontSize} "${info.font}"`

      metrics ??= c.measureText('M')

      c.save()

      // editor.view.clipExact(c)
      // c.beginPath()
      // c.rect(0, editor.view.y, editor.view.w, editor.view.h)
      // // c.clip()

      c.scale(screen.info.pr, screen.info.pr)
      c.translate(-.5, -.5)
      c.translate(editor.view.x, editor.view.y)
      c.translate(editor.scroll.x, editor.scroll.y)

      editor.selection.renderable.draw(c, sparePoint.setParameters(info.textLeft, info.textTop - 2))

      // draw caret
      const { x: caretX, y: caretY } = linecolToPos(editor.buffer)
      if (editor.misc.isFocused) {
        c.fillStyle = '#aaa'
        c.fillRect(caretX - .85, caretY - 2.5, 1.5, info.lineHeight + 1)
      }

      // draw tokens
      c.lineWidth = 0.35 // stroke width
      const baseContent = toHex(screen.info.colors['base-content'] ?? '#fff')
      editor.buffer.source.tokens.forEach(t => {
        c.strokeStyle =
          c.fillStyle =
          editorInfo.Builtin[t.text] ??
          // AstNodeColors[state.tokensAstNode.get(tokensCopyMap.get(t)!)?.type ?? -1] ??
          editorInfo.TokenColors[t.type] ??
          baseContent //#fff'

        const { x, y } = linecolToPos(t)

        // c.strokeStyle = '#000b'
        // c.lineWidth = 4
        // c.strokeText(t.text, x, y)

        // c.strokeStyle = c.fillStyle
        // c.lineWidth = .75
        c.strokeText(t.text, x, y)

        c.fillText(t.text, x, y)
      })

      // c.lineWidth = 2
      // editor.view.stroke(c, '#fff')

      // if (state.error) {
      //   const nodes = (state.error as any)?.cause?.nodes as (AstNode | Token)[]
      //   const flatTokens = nodes.flatMap(n => {
      //     if (n instanceof AstNode) {
      //       return n.captured
      //     }
      //     else {
      //       return n
      //     }
      //   }).filter(Boolean).map(t => tokensCopyRevMap.get(t)).filter(Boolean)
      //   flatTokens.forEach(t => {
      //     const { x, y } = linecolToPos(t)
      //     c.fillStyle = '#ff0'
      //     c.fillRect(x, y + lineHeight - 6, t.text.length * metrics.width, 2)
      //   })
      //   const last = flatTokens.at(-1)
      //   if (last) {
      //     const { x, y } = linecolToPos(last)
      //     const w = state.error.message.length * metrics.width
      //     const mx = Math.max(0, x - w / 2)
      //     const my = y + lineHeight
      //     c.fillStyle = '#000c'
      //     c.fillRect(mx, my, w, lineHeight)
      //     c.fillStyle = '#ff0'
      //     c.fillText(state.error.message, mx, my)
      //   }
      // }
      c.restore()

      // console.log('draw')
    }

    return { editor, editorInfo, drawText }
  }

  function clearCanvas() {
    c.clearRect(0, 0, view.w_pr, view.h_pr)
    // c.fillStyle = '#222b'
    // c.fillRect(0, 0, view.w_pr, view.h_pr)
    // c.fillStyle = screen.info.colors['base-100'] + 'cc'
    // c.fillRect(0, 0, view.w_pr, view.h_pr)
  }

  // const code = Code(codeView)
  const editor = createEditorView(editorView)
  $.fx(() => {
    const { project } = $.of(lib)
    const { activeTrack } = $.of(project.info)
    const { hexColorBrightest } = activeTrack.info.colors
    $()
    editor.editor.buffer.source = activeTrack.info.boxes[0]?.info.source
    editor.editorInfo.brand = hexColorBrightest
  })

  $.fx(() => {
    const { redraw } = info
    $()
    clearCanvas()
    editor.drawText()
    // if (!surface!.anim.info.isRunning) redrawEditors()
    // surface!.anim.info.epoch++
  })

  return { info, canvas, editor, textarea: keyboard.textarea }
}
