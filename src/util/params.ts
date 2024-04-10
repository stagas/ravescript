import wasmGfx from 'assembly-gfx'
import { $ } from 'signal-jsx'
import { ParamValue, ParamValueView } from './params-shared.ts'

export interface BoxParam {
  info: ParamValue
  data: ParamValueView
}

export function createParamValue(time: number, length: number, slope: number, amt: number): BoxParam {
  const param = {
    info: $({
      time,
      length,
      slope,
      amt,
    }),
    data: ParamValueView(wasmGfx.memory.buffer, wasmGfx.createParamValue())
  }
  $.fx(() => {
    const { time, length, slope, amt } = param.info
    $()
    param.data.time = time
    param.data.length = length
    param.data.slope = slope
    param.data.amt = amt
  })
  return param
}
