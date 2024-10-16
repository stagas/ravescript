import { CLICK_TIMEOUT, pointToLinecol, type Pane, type WordWrapProcessor } from 'editor'
import { Sigui, type Signal } from 'sigui'
import { assign, clamp } from 'utils'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { theme } from '~/src/theme.ts'
import { Editor } from '~/src/ui/Editor.tsx'
import { HoverMarkWidget } from '~/src/ui/editor/widgets/index.ts'

export function DspEditor({ code, width, height }: {
  width: Signal<number>
  height: Signal<number>
  code: Signal<string>
}) {
  using $ = Sigui()

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
    code,
  })

  const mouse = { x: 0, y: 0 }
  let number: RegExpMatchArray | undefined
  let value: number
  let digits: number
  let isDot = false
  const hoverMark = HoverMarkWidget()

  function getHoveringNumber(pane: Pane) {
    if (!pane.mouse.info.linecol.hoverLine) return

    const word = pane.buffer.wordUnderLinecol(pane.mouse.info.linecol)
    if (word != null) {
      digits = word[0].split('.')[1]?.length ?? 0
      let string = parseFloat(word[0]).toFixed(digits)
      isDot = word[0][0] === '.'
      if (isDot && string === '0') string = '0.0'
      if (string === `${isDot ? '0' : ''}${word[0]}`) {
        string = parseFloat(word[0]).toFixed(digits)
        return word
      }
    }
  }

  function updateNumberMark(pane: Pane) {
    if (pane.mouse.info.isDown) return
    const temp = getHoveringNumber(pane)
    if (temp && !pane.info.isHoveringScrollbarX && !pane.info.isHoveringScrollbarY) {
      const number = temp
      pane.view.el.style.cursor = 'default'
      const linecol = pointToLinecol(pane.buffer.indexToVisualPoint(number.index))
      assign(
        hoverMark.widget.bounds,
        linecol,
        {
          right: pointToLinecol(pane.buffer.indexToVisualPoint(number.index + number[0].length)).col,
          length: number[0].length,
          bottom: linecol.line,
        }
      )
      pane.draw.widgets.mark.add(hoverMark.widget)
      pane.draw.info.triggerUpdateTokenDrawInfo++
      pane.view.anim.info.epoch++
    }
    else {
      pane.draw.widgets.mark.delete(hoverMark.widget)
      pane.view.anim.info.epoch++
      pane.view.el.style.cursor = pane.view.info.cursor
    }
  }

  function handleNumberDrag(dx: number, dy: number) {
    if (number?.index == null) return

    if (Math.abs(dx) + Math.abs(dy) < .5) return

    let s: string

    let dv =
      Math.max(.001, Math.abs(dx) ** 1.4) * Math.sign(dx) +
      Math.max(.001, Math.abs(dy) ** 1.4) * Math.sign(dy)

    if (dv === 0) dv = 0.001 * (dy > dx ? Math.sign(dy) : Math.sign(dx))
    if (dv === 0) dv = 0.001
    if (dv > 0) dv = Math.max(0.001, dv)
    if (dv < 0) dv = Math.min(-0.001, dv)

    let min: number
    let max: number
    let mul = 0.0017
    if (value >= 10_000 && value < 100_000) {
      min = 10_000
      max = parseFloat('99999.' + (digits ? '9'.repeat(digits) : '0'))
    }
    else if (value >= 1_000 && value < 10_000) {
      min = 1_000
      max = parseFloat('9999.' + (digits ? '9'.repeat(digits) : '0'))
    }
    else if (value >= 100 && value < 1_000) {
      min = 100
      max = parseFloat('999.' + (digits ? '9'.repeat(digits) : '0'))
    }
    else if (value >= 10 && value < 100) {
      min = 10
      max = parseFloat('99.' + (digits ? '9'.repeat(digits) : '0'))
    }
    else if (value >= 1 && value < 10) {
      min = 1
      max = parseFloat('9.' + (digits ? '9'.repeat(digits) : '0'))
      if (!digits) mul = 0.005
    }
    else if (value >= 0 && value < 1) {
      min = 0
      max = parseFloat('0.' + (digits ? '9'.repeat(digits) : '0'))
      if (digits === 1) mul = 0.005
    }
    else {
      return
    }

    const scale = max - min
    let normal = (value - min) / scale
    normal = clamp(0, 1, normal - dv * mul)
    value = normal * scale + min
    s = value.toFixed(digits)
    if (isDot) s = s.slice(1)
    const { code } = editor.info.pane.buffer
    editor.info.pane.buffer.code = `${code.slice(0, number.index)}${s}${code.slice(number.index + s.length)}`
  }

  function onKeyDown(pane: Pane) {
    queueMicrotask(() => {
      updateNumberMark(pane)
    })
  }

  function onKeyUp(pane: Pane) {
    updateNumberMark(pane)
    if (!pane.kbd.info.ctrl) {
      number = void 0
    }
  }

  function onMouseWheel(pane: Pane) {
    let ret = false

    if (pane.mouse.info.ctrl || pane.kbd.info.ctrl) {
      updateNumberMark(pane)
      if (number?.index != null || onMouseDown(pane)) ret = true
      if (ret) {
        handleNumberDrag(
          -pane.mouse.info.wheel.x * .06,
          -pane.mouse.info.wheel.y * .06
        )
      }
    }
    else {
      number = void 0
    }

    return ret
  }

  let clickTimeout: any
  let clickCount = 0

  function onMouseDown(pane: Pane) {
    clickCount++

    clearTimeout(clickTimeout)
    clickTimeout = setTimeout(() => {
      clickCount = 0
    }, CLICK_TIMEOUT)

    if (clickCount >= 2) return

    number = getHoveringNumber(pane)

    if (number?.index == null) return

    value = parseFloat(number[0])
    mouse.x = pane.mouse.info.x
    mouse.y = pane.mouse.info.y
    return true
  }

  function onMouseMove(pane: Pane) {
    if (number?.index == null) {
      updateNumberMark(pane)
      return
    }
    const p = pane.mouse.info
    const dx = mouse.x - p.x
    const dy = p.y - mouse.y
    mouse.x = p.x
    mouse.y = p.y
    handleNumberDrag(dx, dy)
    return true
  }

  function onMouseUp(pane: Pane) {
    if (number && clickCount <= 1) {
      number = void 0
      return true
    }
  }

  const inputHandlers = {
    onKeyDown,
    onKeyUp,
    onMouseWheel,
    onMouseDown,
    onMouseUp,
    onMouseMove,
  }

  const baseColors = {
    [Token.Type.Native]: theme.colors.sky,
    [Token.Type.String]: theme.colors.sky,
    [Token.Type.Keyword]: theme.colors.sky,
    [Token.Type.Op]: theme.colors.neutral,
    [Token.Type.Id]: theme.colors.neutral,
    [Token.Type.Number]: theme.colors.neutral,
    [Token.Type.BlockComment]: theme.colors.sky,
    [Token.Type.Comment]: theme.colors.sky,
    [Token.Type.Any]: theme.colors.sky,
  }

  const colors: Partial<Record<Token.Type, { fill: string, stroke: string }>> = {
    [Token.Type.Native]: { fill: baseColors[Token.Type.Native][500], stroke: baseColors[Token.Type.Native][500] },
    [Token.Type.String]: { fill: baseColors[Token.Type.String][700], stroke: baseColors[Token.Type.String][700] },
    [Token.Type.Keyword]: { fill: baseColors[Token.Type.Keyword][500], stroke: baseColors[Token.Type.Keyword][500] },
    [Token.Type.Op]: { fill: baseColors[Token.Type.Op][500], stroke: baseColors[Token.Type.Op][500] },
    [Token.Type.Id]: { fill: baseColors[Token.Type.Id][400], stroke: baseColors[Token.Type.Id][400] },
    [Token.Type.Number]: { fill: baseColors[Token.Type.Number][100], stroke: baseColors[Token.Type.Number][100] },
    [Token.Type.BlockComment]: { fill: baseColors[Token.Type.BlockComment][700], stroke: baseColors[Token.Type.BlockComment][700] },
    [Token.Type.Comment]: { fill: baseColors[Token.Type.Comment][700], stroke: baseColors[Token.Type.Comment][700] },
    [Token.Type.Any]: { fill: baseColors[Token.Type.Any][500], stroke: baseColors[Token.Type.Any][500] },
  }

  function colorize(token: Token<Token.Type>) {
    const { fill = '#888', stroke = '#888' } = colors[token.type] ?? {}
    return { fill, stroke }
  }

  const wordWrapProcessor: WordWrapProcessor = {
    pre(input: string) {
      return input.replace(/\[(\w+)([^\]\n]+)\]/g, (_: any, word: string, chunk: string) => {
        const c = chunk.replace(/\s/g, '\u0000')
        return `[${word}${c}]`
      })
    },
    post(input: string) {
      return input.replaceAll('\u0000', ' ')
    }
  }

  const editor = Editor({
    width: info.$.width,
    height: info.$.height,
    code: info.$.code,
    colorize,
    tokenize,
    wordWrapProcessor,
    inputHandlers,
  })

  return editor
}
