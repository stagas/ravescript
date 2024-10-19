import fs from 'node:fs'

function writeIfNotEqual(filename: string, text: string): void {
  let existingText = ''

  try {
    existingText = fs.readFileSync(filename, 'utf-8')
  }
  catch (e) {
    const error: NodeJS.ErrnoException = e as any
    if (error.code !== 'ENOENT') {
      throw error
    }
  }

  if (existingText !== text) {
    fs.writeFileSync(filename, text, 'utf-8')
    console.log(`File "${filename}" ${existingText ? 'updated' : 'created'}.`)
  }
}

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)
const numericTypes = new Set('usize i32 u32 f32'.split(' '))
const floatTypes = new Set('f32')
const parseFuncsRegExp = /(?<fn>[a-z]+)\((?<args>.*)\)(?::.*?){/gi
const indent = (n: number, s: string) => s.split('\n').map(x => ' '.repeat(n) + x).join('\n')

const srcFilename = './as/assembly/dsp/vm/dsp.ts'
const code = fs.readFileSync(srcFilename, 'utf-8')
const fns = [...code.matchAll(parseFuncsRegExp)].map(m => ({
  fn: m.groups!.fn,
  args: m.groups!.args
    .split(', ')
    .slice(1) // arg 0 is always context, which is passed to the factory earlier
    .map(x => x.split(': ')) as [name: string, type: string][]
})).filter(({ fn }) => fn !== 'constructor')

const api = [
  `Begin(): void {
  DEBUG && console.log('Begin')
  i = 0
}`,
  `End(): number {
  DEBUG && console.log('End')
  ops_u32[i++] = 0
  return i
}`,
  ...fns.map(({ fn, args }) => `${fn}(${args.map(([name, type]) =>
    `${name}: ${numericTypes.has(type) ? type : 'usize'}`).join(', ')}): void {
  DEBUG && console.log('${fn}', ${args.map(([name, type]) => name).join(', ')})
  ops_u32[i++] = Op.${fn}
${indent(2, args.map(([name, type]) => `ops_${numericTypes.has(type) ? type : 'u32'}[i++] = ${name}`).join('\n'))}
}`
  )
]

{
  const out = /*ts*/`\
// TypeScript VM Producer Factory
// auto-generated from scripts
import { Op } from '~/generated/assembly/dsp-op.ts'
import { DEBUG } from '~/src/as/dsp/constants.ts'

${[...numericTypes].map(x => `type ${x} = number`).join('\n')}

export type DspVm = ReturnType<typeof createVm>

export function createVm(ops: Int32Array) {
  const ops_i32 = ops
  const ops_u32 = new Uint32Array(ops.buffer, ops.byteOffset, ops.length)
  const ops_f32 = new Float32Array(ops.buffer, ops.byteOffset, ops.length)
  let i = 0
  return {
    get index() {
      return i
    },
${indent(4, api.join(',\n'))}
  }
}
`
  const outFilename = './generated/typescript/dsp-vm.ts'
  writeIfNotEqual(outFilename, out)
}

{
  const out = /*ts*/`\
// TypeScript + AssemblyScript Ops Enum
// auto-generated from scripts
export enum Op {
  End,
  Begin,
${indent(2, fns.map(({ fn }) => `${fn}`).join(',\n'))}
}
`
  const outFilename = './generated/assembly/dsp-op.ts'
  writeIfNotEqual(outFilename, out)
}

{
  const out = /*ts*/`\
// AssemblyScript VM Runner
// auto-generated from scripts
import { Op } from './dsp-op'
import { Dsp, DspBinaryOp } from '../../as/assembly/dsp/vm/dsp'
import { Sound } from '../../as/assembly/dsp/vm/sound'

const dsp = new Dsp()

export function run(sound$: usize, ops$: usize): void {
  const snd = changetype<Sound>(sound$)
  const ops = changetype<StaticArray<i32>>(ops$)

  let i: i32 = 0
  let op: i32 = 0

  while (unchecked(op = ops[i++])) {
    switch (op) {

${indent(6, fns.map(({ fn, args }) =>
    `case Op.${fn}:
  dsp.${fn}(
    snd,
${indent(4, args.map(([, type]) =>
      `changetype<${type}>(unchecked(ops[i++]))`
    ).join(',\n'))}
  )
  continue`).join('\n\n') + '\n')}
    } // end switch
  } // end while
}
`
  const outFilename = './generated/assembly/dsp-runner.ts'
  writeIfNotEqual(outFilename, out)
}

console.log('done generate-dsp-vm.')
