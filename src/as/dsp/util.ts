import { ValuesOf } from 'utils'
import { Gen, dspGens } from '~/generated/typescript/dsp-gens.ts'

export function getAllProps(k: keyof Gen) {
  const gen = dspGens[k]
  const props: ValuesOf<(typeof dspGens)[keyof Gen]['props']>[] = []
  if ('inherits' in gen && gen.inherits) {
    props.push(...getAllProps(gen.inherits))
  }
  props.push(...gen.props)
  return props
}

export function getAllPropsReverse(k: keyof Gen) {
  const gen = dspGens[k]
  const props: ValuesOf<(typeof dspGens)[keyof Gen]['props']>[] = []
  props.push(...gen.props)
  if ('inherits' in gen && gen.inherits) {
    props.push(...getAllPropsReverse(gen.inherits))
  }
  return props
}

export function getAllPropsDetailed(k: keyof Gen) {
  const gen = dspGens[k]
  const props: { name: ValuesOf<(typeof dspGens)[keyof Gen]['props']>, ctor: typeof k }[] = []
  if ('inherits' in gen && gen.inherits) {
    props.push(...getAllPropsDetailed(gen.inherits))
  }
  props.push(...gen.props.map(x => ({ name: x, ctor: k })))
  return props
}
