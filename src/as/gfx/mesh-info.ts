import { GL, GLBuffer, GLBufferTarget } from 'gl-util'
import { Sigui } from 'sigui'

export interface MeshSetup<
  U extends Parameters<GL['addVertexAttribs']>[0]
> {
  vertex: string | ((gl?: WebGL2RenderingContext) => string)
  fragment: string | ((gl?: WebGL2RenderingContext) => string)
  vao?: U
}

export type MeshInfo = ReturnType<typeof MeshInfo>

export function MeshInfo<
  T extends GLBufferTarget,
  U extends Parameters<GL['addVertexAttribs']>[0]
>(GL: GL, setup: MeshSetup<U>) {
  using $ = Sigui()

  const { gl } = GL

  const shaders = GL.createShaders(setup)
  const program = GL.createProgram(shaders)

  let use = () => GL.useProgram(program)
  let useProgram = () => GL.useProgram(program)

  const info = {
    program,
    use,
    useProgram,
    vao: undefined as WebGLVertexArrayObject | undefined,
    attribs: {} as { [K in keyof U]: GLBuffer<ReturnType<U[K][1]>> },
    get uniforms() {
      GL.useProgram(program)
      return GL.uniforms
    }
  }

  if (setup.vao) {
    info.vao = GL.createVertexArray()
    info.attribs = GL.addVertexAttribs(setup.vao) as any
    info.use = () => GL.use(program, info.vao!)
    info.useProgram = () => GL.useProgram(program)
  }

  $.fx(() => () => {
    GL.deleteShaders(shaders)
    gl.deleteProgram(program)
    if (info.vao) {
      gl.deleteVertexArray(info.vao)
      GL.deleteAttribs(info.attribs!)
    }
  })

  return info
}
