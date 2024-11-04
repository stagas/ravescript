import { getAllProps, getAllPropsDetailed, getAllPropsReverse } from 'dsp'
import { H3 } from 'ui'
import { keys } from 'utils'
import { dspGens } from '~/generated/typescript/dsp-gens.ts'

const HIDDEN_PROPS = new Set<any>([
  'gain',
])
const AUDIO_PROPS = new Set<any>([
  'in',
  'sidechain',
])
const STACK_PROPS = new Set<any>([
  'in',
])
const HIDDEN_GENS = new Set<any>([
  'gen',
  'osc',
  'biquad',
  'moog',
  'svf',
  'dcc',
  'dcfix',
])

const OPERATORS = {
  '=': { name: 'assign', kind: 'binary' },
  '?': { name: 'pick', kind: 'binary' },
  '+': { name: 'add', kind: 'binary' },
  '-': { name: 'subtract', kind: 'binary' },
  '*': { name: 'multiply', kind: 'binary' },
  '/': { name: 'divide', kind: 'binary' },
  '%': { name: 'modulo', kind: 'binary' },
  '^': { name: 'power', kind: 'binary' },
}

export function Help() {
  return <div class="h-[80dvh]">
    <div class="flex flex-col flex-wrap gap-4">
      <H3>Gens</H3>
      <div class="h-[50dvh] flex flex-col flex-wrap gap-4">
        {keys(dspGens).filter(name => !HIDDEN_GENS.has(name)).map(name => {
          const props = getAllProps(name)
          return <div>
            <span class="text-neutral-200">{name}</span>
            <div class="w-20 flex flex-row flex-wrap gap-1">
              {props.filter(name => !HIDDEN_PROPS.has(name)).map(name =>
                <span class="text-xs leading-none">{name}</span>
              )}
            </div>
          </div>
        })}
      </div>
    </div>
    <div class="flex flex-col flex-wrap gap-4">
      <H3>Ops</H3>
      <div class="h-[15dvh] flex flex-col flex-wrap">
        {keys(OPERATORS).map(id => {
          const { name, kind } = OPERATORS[id]
          return <div class="flex flex-row flex-nowrap items-center gap-1">
            <span class="text-neutral-200">{id}</span>
            <span class="">{name}</span>
          </div>
        })}
      </div>
    </div>
  </div>
}
