import fs from 'fs'
import { basename, join } from 'path'
import { capitalize, writeIfNotEqual } from '~/scripts/util.ts'

const gensRoot = './as/assembly/dsp/gen'
const files = fs.readdirSync(gensRoot).sort()

const extendsRegExp = /extends\s([^\s]+)/

let out: string[] = []
out.push(`import { Engine } from '../../as/assembly/dsp/core/engine'`)
const factories: string[] = []
for (const file of files) {
  const base = basename(file, '.ts')
  const filename = join(gensRoot, file)
  const text = fs.readFileSync(filename, 'utf-8')
  const parentCtor = text.match(extendsRegExp)?.[1]
  const ctor = capitalize(base)
  const factory = `create${ctor}`
  out.push(`import { ${ctor} } from '../.${gensRoot}/${base}'`)
  if (['osc', 'gen'].includes(base)) {
    factories.push(`createZero`) // dummy because they are abstract
    continue
  }
  factories.push(factory)
  out.push(`function ${factory}(engine: Engine): ${ctor} { return new ${ctor}(engine) }`)
}

out.push(`export const Factory: ((engine: Engine) => Gen)[] = [${factories}]`)

const targetPath = './generated/assembly/dsp-factory.ts'
const text = out.join('\n')
writeIfNotEqual(targetPath, text)

console.log('done update-dsp-factory.')
