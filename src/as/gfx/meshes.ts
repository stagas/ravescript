import type { Rect } from 'gfx'
import { GL } from 'gl-util'
import { Sigui } from 'sigui'

const DEBUG = true

export interface MeshProps {
  GL: GL
  view: Rect
}

export interface Mesh {
  draw(): void
}

export function Meshes(GL: GL, view: Rect) {
  DEBUG && console.debug('[meshes] create')
  using $ = Sigui()

  const { gl, canvas } = GL
  const meshes = new Set<Mesh>()

  function clear() {
    gl.viewport(
      view.x_pr,
      canvas.height - view.h_pr - view.y_pr,
      Math.max(0, view.w_pr),
      Math.max(0, view.h_pr),
    )
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  function draw() {
    DEBUG && console.debug('[meshes] draw', meshes.size)
    clear()
    for (const mesh of meshes) {
      mesh.draw()
    }
  }

  function add($: Sigui, mesh: Mesh) {
    $.fx(() => {
      meshes.add(mesh)
      return () => {
        meshes.delete(mesh)
      }
    })
  }

  $.fx(() => () => {
    DEBUG && console.debug('[meshes] clear')
    meshes.clear()
  })

  return { GL, draw, add }
}
