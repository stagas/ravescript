import { pointToLinecol, type Pane, type WordWrapProcessor } from 'editor'
import { wasm } from 'gfx'
import { Sigui, type Signal } from 'sigui'
import { assign, clamp } from 'utils'
import { AnimMode } from '~/src/comp/AnimMode.tsx'
import { Token, tokenize } from '~/src/lang/tokenize.ts'
import { screen } from '~/src/screen.ts'
import { theme } from '~/src/theme.ts'
import { Editor } from '~/src/ui/Editor.tsx'
import { makeWaveform, waveform } from '~/src/ui/editor/util/waveform.ts'
import { HoverMarkWidget, WaveCanvasWidget } from '~/src/ui/editor/widgets/index.ts'
import { WaveGlWidget } from '~/src/ui/editor/widgets/wave-gl.ts'
import { WaveSvgWidget } from '~/src/ui/editor/widgets/wave-svg.tsx'
import { H2 } from '~/src/ui/Heading.tsx'

export function EditorDemo({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const info = $({
    c: null as null | CanvasRenderingContext2D,
    pr: screen.$.pr,
    width,
    height,
    code: `\
[dly 16 0.555 /]
[sin 3]
    [tri 111] [tri 222] [tri 333] [tri 444] [tri 555] [tri 666]
    [saw 123]
  [sqr 555] @
[lp 300 .8]
[ppd (3 4 5)]
[ar 10 50] *`,
  })

  const mouse = { x: 0, y: 0 }
  let number: RegExpMatchArray | undefined
  let value: number
  let digits: number
  let isDot = false
  const hoverMark = HoverMarkWidget()

  function getHoveringNumber(pane: Pane) {
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
    if (value >= 100 && value < 1000) {
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
    const { code } = pane.buffer
    pane.buffer.code = `${code.slice(0, number.index)}${s}${code.slice(number.index + s.length)}`
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

  function onMouseDown(pane: Pane) {
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
    if (number) {
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

  const colors: Partial<Record<Token.Type, { fill: string, stroke: string }>> = {
    [Token.Type.Native]: { fill: theme.colors.sky[500], stroke: theme.colors.sky[500] },
    [Token.Type.String]: { fill: theme.colors.fuchsia[700], stroke: theme.colors.fuchsia[700] },
    [Token.Type.Keyword]: { fill: theme.colors.orange[500], stroke: theme.colors.orange[500] },
    [Token.Type.Op]: { fill: theme.colors.sky[500], stroke: theme.colors.sky[500] },
    [Token.Type.Id]: { fill: theme.colors.yellow[500], stroke: theme.colors.yellow[500] },
    [Token.Type.Number]: { fill: theme.colors.green[500], stroke: theme.colors.green[500] },
    [Token.Type.BlockComment]: { fill: theme.colors.neutral[700], stroke: theme.colors.neutral[700] },
    [Token.Type.Comment]: { fill: theme.colors.neutral[700], stroke: theme.colors.neutral[700] },
    [Token.Type.Any]: { fill: theme.colors.neutral[500], stroke: theme.colors.neutral[500] },
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

  //   const pane2Info = $({
  //     code: `[hello]
  // [world]
  // [world]
  // [world]
  // [world]
  // [world]
  // [world]
  // [world]
  // [world]
  // `
  //   })
  //   const pane2 = editor.createPane({
  //     rect: $(Rect(), { x: 0, y: 240, w: 200, h: 200 }),
  //     code: pane2Info.$.code,
  //   })
  //   editor.addPane(pane2)

  // ///////////////////
  const floats = Object.assign(
    wasm.alloc(Float32Array, waveform.length),
    { len: waveform.length }
  )
  floats.set(waveform)

  const [pane] = editor.info.panes
  // editor.view.gfx.matrix.f = 20
  // pane.dims.info.scrollY = -20
  $.fx(() => {
    const { tokens } = pane.buffer.info
    $()
    const gens: Token[][] = []

    let depth = 0
    let gen: Token[] = []
    for (const token of tokens) {
      if (token.text === '[') {
        depth++
      }
      else if (token.text === ']') {
        gen.push(token)
        depth--
        if (!depth) {
          gens.push(gen)
          gen = []
        }
      }
      if (depth) gen.push(token)
    }

    if (gens.length < 2) return

    const d = WaveCanvasWidget()
    d.info.floats = floats
    Object.assign(d.widget.bounds, Token.bounds(gens[0]))
    pane.draw.widgets.deco.add(d.widget)

    const d2 = WaveGlWidget(pane.draw.shapes)
    d2.info.floats = floats
    Object.assign(d2.widget.bounds, Token.bounds(gens[1]))
    pane.draw.widgets.deco.add(d2.widget)

    const d3 = WaveSvgWidget()
    d3.info.floats = floats
    Object.assign(d3.widget.bounds, Token.bounds(gens[2]))
    pane.draw.widgets.deco.add(d3.widget)

    const paneSvg = <svg
      x={pane.dims.info.rect.x}
      y={pane.dims.info.rect.y}
      width={() => pane.dims.info.rect.w}
      height={() => pane.dims.info.rect.h}
      viewBox={() => `${-pane.dims.info.scrollX} ${-pane.dims.info.scrollY} ${pane.dims.info.rect.w} ${pane.dims.info.rect.h}`}

    /> as SVGSVGElement
    paneSvg.append(d3.svg)
    editor.view.info.svgs.add(paneSvg)
    editor.view.info.svgs = new Set(editor.view.info.svgs)

    return () => {
      pane.draw.widgets.deco.delete(d.widget)
      pane.draw.widgets.deco.delete(d2.widget)
      d2.dispose()
      pane.draw.widgets.deco.delete(d3.widget)

      editor.view.info.svgs.delete(paneSvg)
      editor.view.info.svgs = new Set(editor.view.info.svgs)
    }
  })
  pane.draw.widgets.update()

  // const d2 = WaveGlWidget(pane2.draw.shapes)
  // d2.info.floats = floats
  // Object.assign(d2.widget.bounds, { line: 0, col: 0, right: 5, bottom: 0 })
  // pane2.draw.widgets.deco.add(d2.widget)
  // pane2.draw.widgets.update()

  let t = 101
  floats.set(makeWaveform(2048, t += 1, 1 + Math.sin(t * 0.025) * 59))

  ///////////////////

  const el = <div>
    <div class="flex items-center justify-between">
      <H2>Editor demo</H2>
      <AnimMode anim={editor.view.anim} />
    </div>
    {editor}
  </div>

  return { el, focus: editor.focus }
}
