import { Anim, Gfx } from 'gfx'
import { Signal, Sigui } from 'sigui'
import { Canvas } from '../Canvas.tsx'
import { screen } from '~/src/screen.ts'

export type View = ReturnType<typeof View>

export function View({ width, height }: {
  width: Signal<number>
  height: Signal<number>
}) {
  using $ = Sigui()

  const info = $({
    pr: screen.$.pr,
    cursor: 'default',
    width,
    height,
    svgs: new Set<SVGElement>(),
  })

  const canvas = <Canvas width={width} height={height} class="absolute top-0 left-0" /> as HTMLCanvasElement
  const glCanvas = <Canvas width={width} height={height} class="absolute top-0 left-0" /> as HTMLCanvasElement
  const svg = <svg width={width} height={height} class="absolute top-0 left-0" >
    {() => [...info.svgs]}
  </svg> as SVGSVGElement

  const el = <div class="relative" style={() => ({ cursor: info.cursor })}>
    {canvas}
    {glCanvas}
    {svg}
  </div> as HTMLDivElement

  const c = canvas.getContext('2d')!

  // initialize canvas context settings
  $.fx(() => {
    const { pr, width, height } = $.of(info)
    $()
    c.scale(pr, pr)
    c.imageSmoothingEnabled = false
    c.textBaseline = 'top'
    c.textRendering = 'optimizeLegibility'
    c.miterLimit = 1.5
    c.font = '16px "IBM Plex Mono", monospace'
  })

  const anim = Anim()
  // anim.ticks.add(draw)

  const gfx = Gfx({ width, height, canvas: glCanvas })

  const textarea = <textarea
    spellcheck="false"
    autocorrect="off"
    autocapitalize="off"
    autocomplete="off"
    virtualkeyboardpolicy="auto"
    class="
      fixed right-0 top-0 opacity-0 w-[50px] h-[50px]
      pointer-events-none caret-transparent
      border-none outline-none
      resize-none p-0 whitespace-pre
      overflow-hidden z-50
    "
  /> as HTMLTextAreaElement

  return $({
    el,
    info,
    canvas,
    c,
    glCanvas,
    svg,
    svgs: info.$.svgs,
    gfx,
    anim,
    textarea,
  })
}
