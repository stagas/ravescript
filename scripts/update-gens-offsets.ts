import { Gen, dspGens } from '~/generated/typescript/dsp-gens.ts'
import { capitalize, writeIfNotEqual } from '~/scripts/util.ts'
import { getAllPropsDetailed } from '~/src/as/dsp/util.ts'

let out: string[] = []
const offsets: string[] = []
for (const k in dspGens) {
  const props = getAllPropsDetailed(k as keyof Gen)
  out.push(`import { ${capitalize(k)} } from '../../as/assembly/dsp/gen/${k.toLowerCase()}'`)
  offsets.push(`  [${props.map(x => `offsetof<${capitalize(x.ctor)}>('${x.name}')`)}]`)
}

out.push('export const Offsets: usize[][] = [')
out.push(offsets.join(',\n'))
out.push(']')

const targetPath = './generated/assembly/dsp-offsets.ts'
const text = out.join('\n')
writeIfNotEqual(targetPath, text)

console.log('done update-gens-offsets.')
