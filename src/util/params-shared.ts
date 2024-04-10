import { Struct } from 'utils'

export interface ParamValue {
  time: number
  length: number
  slope: number
  amt: number
}

export type ParamValueView = ReturnType<typeof ParamValueView>

export const ParamValueView = Struct({
  time: 'f32',
  length: 'f32',
  slope: 'f32',
  amt: 'f32',
})
