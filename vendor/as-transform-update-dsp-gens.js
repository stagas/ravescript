'use strict'

import { Transform } from 'assemblyscript/transform'
import Binaryen from 'assemblyscript/binaryen'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'
import { capitalize, extendsRegExp, sortObjectInPlace } from './util.js'

class UpdateDspGens extends Transform {
  afterCompile(module) {
    const fnCount = module.getNumFunctions()
    const dspGens = {}
    for (let i = 0; i < fnCount; i++) {
      const fnRef = module.getFunctionByIndex(i)
      const info = Binaryen.getFunctionInfo(fnRef)
      const name = info.name
      if (name.includes('~visit'))
        continue
      if (name.startsWith('as/assembly/')) {
        const fnId = name.split('/').pop()
        let [instanceName, propId = ''] = fnId.split('#')
        if (/^[A-Z]/.test(instanceName) && /\/gen\//.test(name)) {
          instanceName = instanceName.toLowerCase()
          const propName = propId?.split(':')[1]
          let inherits
          if (!(instanceName in dspGens)) {
            const filepath = './' + name.toLowerCase().split('#')[0].split('/').slice(0, -1).join('/') + '.ts'
            const text2 = fs.readFileSync(filepath, 'utf-8')
            const parentCtor = text2.match(extendsRegExp)?.[1]
            if (parentCtor)
              inherits = parentCtor.toLowerCase()
          }
          const obj = dspGens[instanceName] ??= {
            inherits,
            props: []
          }
          if (!obj.inherits)
            delete obj.inherits
          if (propId.startsWith('set:') || propId.startsWith('get:')) {
            if (!propName.startsWith('_') && !obj.props.includes(propName))
              obj.props.push(propName)
          } else if (propId === '_audio') {
            obj.hasAudioOut = true
          } else if (propId === '_audio_stereo') {
            obj.hasStereoOut = true
          }
        }
      }
    }
    sortObjectInPlace(dspGens)
    const audioProps = ['in', 'sidechain']
    const textProps = ['text', 'id']
    const interfaces = Object.entries(dspGens).map(
      ([k, v]) => `  export interface ${capitalize(k)} ${v.inherits ? `extends ${capitalize(v.inherits)} ` : ''}{
${v.props.map((x, i) => `    ${x}?: ${audioProps.includes(x) ? 'Value.Audio' : textProps.includes(x) ? 'string' : 'Value | number'}`).join('\n')}
  }`
    ).join('\n')
    function hasAudioOut(k) {
      const gen = dspGens[k]
      let res
      if (gen.hasAudioOut)
        res = true
      else if (gen.inherits && gen.inherits !== 'gen' && hasAudioOut(gen.inherits))
        res = true
      if (res) {
        gen.hasAudioOut = true
      }
      return res
    }
    const types = Object.keys(dspGens).map(
      (k) => `  ${k}: (p: Props.${capitalize(k)}) => ${hasAudioOut(k) ? 'Value.Audio' : 'void'}`
    ).join('\n')
    const formatted = util.format('%O', dspGens)
    const date = new Date()
    const text = /*ts*/`//
// auto-generated ${date.toDateString()} ${date.toTimeString()}

import { Value } from '../../src/dsp/value.ts'

export const dspGens = ${formatted} as const

export namespace Props {
${interfaces}
}

export interface Gen {
${types}
}
`
    const filename = path.join(process.cwd(), 'generated', 'typescript', 'dsp-gens.ts')
    fs.writeFileSync(filename, text)
  }
}
export default UpdateDspGens
