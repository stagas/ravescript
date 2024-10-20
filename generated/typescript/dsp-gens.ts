//
// auto-generated Sun Oct 20 2024 22:30:57 GMT+0300 (Eastern European Summer Time)

import { Value } from '../../src/as/dsp/value.ts'

export const dspGens = {
  adsr: {
    inherits: 'gen',
    props: [ 'attack', 'decay', 'sustain', 'release', 'on', 'off' ],
    hasAudioOut: true
  },
  aosc: { inherits: 'osc', props: [], hasAudioOut: true },
  atan: { inherits: 'gen', props: [ 'in' ], hasAudioOut: true },
  bap: { inherits: 'biquad', props: [ 'cut', 'q' ], hasAudioOut: true },
  bbp: { inherits: 'biquad', props: [ 'cut', 'q' ], hasAudioOut: true },
  bhp: { inherits: 'biquad', props: [ 'cut', 'q' ], hasAudioOut: true },
  bhs: {
    inherits: 'biquad',
    props: [ 'cut', 'q', 'amt' ],
    hasAudioOut: true
  },
  biquad: { inherits: 'gen', props: [ 'in' ], hasAudioOut: true },
  blp: { inherits: 'biquad', props: [ 'cut', 'q' ], hasAudioOut: true },
  bls: {
    inherits: 'biquad',
    props: [ 'cut', 'q', 'amt' ],
    hasAudioOut: true
  },
  bno: { inherits: 'biquad', props: [ 'cut', 'q' ], hasAudioOut: true },
  bpk: {
    inherits: 'biquad',
    props: [ 'cut', 'q', 'amt' ],
    hasAudioOut: true
  },
  clamp: { inherits: 'gen', props: [ 'min', 'max', 'in' ], hasAudioOut: true },
  clip: { inherits: 'gen', props: [ 'threshold', 'in' ], hasAudioOut: true },
  comp: {
    inherits: 'gen',
    props: [ 'threshold', 'ratio', 'attack', 'release', 'in', 'sidechain' ],
    hasAudioOut: true
  },
  daverb: {
    inherits: 'gen',
    props: [
      'in', 'pd', 'bw',
      'fi', 'si', 'dc',
      'ft', 'st', 'dp',
      'ex', 'ed'
    ],
    hasAudioOut: true,
    hasStereoOut: true
  },
  dcc: {
    inherits: 'gen',
    props: [ 'ceil', 'in', 'sample' ],
    hasAudioOut: true
  },
  dclip: { inherits: 'gen', props: [ 'in' ], hasAudioOut: true },
  dclipexp: { inherits: 'gen', props: [ 'factor', 'in' ], hasAudioOut: true },
  dcliplin: {
    inherits: 'gen',
    props: [ 'threshold', 'factor', 'in' ],
    hasAudioOut: true
  },
  delay: { inherits: 'gen', props: [ 'ms', 'fb', 'in' ], hasAudioOut: true },
  diode: {
    inherits: 'gen',
    props: [ 'cut', 'hpf', 'sat', 'q', 'in' ],
    hasAudioOut: true
  },
  exp: { inherits: 'osc', props: [], hasAudioOut: true },
  freesound: { inherits: 'smp', props: [ 'id' ], hasAudioOut: true },
  gen: { props: [ 'gain' ], hasAudioOut: true, hasStereoOut: true },
  gendy: { inherits: 'gen', props: [ 'step' ], hasAudioOut: true },
  grain: { inherits: 'gen', props: [ 'amt' ], hasAudioOut: true },
  inc: { inherits: 'gen', props: [ 'amt', 'trig' ], hasAudioOut: true },
  lp: { inherits: 'gen', props: [ 'cut', 'in' ], hasAudioOut: true },
  mhp: { inherits: 'moog', props: [ 'cut', 'q' ], hasAudioOut: true },
  mlp: { inherits: 'moog', props: [ 'cut', 'q' ], hasAudioOut: true },
  moog: { inherits: 'gen', props: [ 'in' ] },
  noi: { inherits: 'osc', props: [], hasAudioOut: true },
  nrate: { inherits: 'gen', props: [ 'normal' ] },
  osc: {
    inherits: 'gen',
    props: [ 'hz', 'trig', 'offset' ],
    hasAudioOut: true
  },
  ramp: { inherits: 'aosc', props: [], hasAudioOut: true },
  rate: { inherits: 'gen', props: [ 'samples' ] },
  sap: { inherits: 'svf', props: [ 'cut', 'q' ], hasAudioOut: true },
  saw: { inherits: 'aosc', props: [], hasAudioOut: true },
  say: { inherits: 'smp', props: [ 'text' ], hasAudioOut: true },
  sbp: { inherits: 'svf', props: [ 'cut', 'q' ], hasAudioOut: true },
  shp: { inherits: 'svf', props: [ 'cut', 'q' ], hasAudioOut: true },
  sin: { inherits: 'osc', props: [], hasAudioOut: true },
  slp: { inherits: 'svf', props: [ 'cut', 'q' ], hasAudioOut: true },
  smp: {
    inherits: 'gen',
    props: [ 'offset', 'length', 'trig' ],
    hasAudioOut: true
  },
  sno: { inherits: 'svf', props: [ 'cut', 'q' ], hasAudioOut: true },
  spk: { inherits: 'svf', props: [ 'cut', 'q' ], hasAudioOut: true },
  sqr: { inherits: 'aosc', props: [], hasAudioOut: true },
  svf: { inherits: 'gen', props: [ 'in' ] },
  tanh: { inherits: 'gen', props: [ 'in' ], hasAudioOut: true },
  tanha: { inherits: 'gen', props: [ 'in' ], hasAudioOut: true },
  tap: { inherits: 'gen', props: [ 'ms', 'in' ], hasAudioOut: true },
  tri: { inherits: 'aosc', props: [], hasAudioOut: true },
  zero: { inherits: 'gen', props: [], hasAudioOut: true }
} as const

export namespace Props {
  export interface Adsr extends Gen {
    attack?: Value | number
    decay?: Value | number
    sustain?: Value | number
    release?: Value | number
    on?: Value | number
    off?: Value | number
  }
  export interface Aosc extends Osc {

  }
  export interface Atan extends Gen {
    in?: Value.Audio
  }
  export interface Bap extends Biquad {
    cut?: Value | number
    q?: Value | number
  }
  export interface Bbp extends Biquad {
    cut?: Value | number
    q?: Value | number
  }
  export interface Bhp extends Biquad {
    cut?: Value | number
    q?: Value | number
  }
  export interface Bhs extends Biquad {
    cut?: Value | number
    q?: Value | number
    amt?: Value | number
  }
  export interface Biquad extends Gen {
    in?: Value.Audio
  }
  export interface Blp extends Biquad {
    cut?: Value | number
    q?: Value | number
  }
  export interface Bls extends Biquad {
    cut?: Value | number
    q?: Value | number
    amt?: Value | number
  }
  export interface Bno extends Biquad {
    cut?: Value | number
    q?: Value | number
  }
  export interface Bpk extends Biquad {
    cut?: Value | number
    q?: Value | number
    amt?: Value | number
  }
  export interface Clamp extends Gen {
    min?: Value | number
    max?: Value | number
    in?: Value.Audio
  }
  export interface Clip extends Gen {
    threshold?: Value | number
    in?: Value.Audio
  }
  export interface Comp extends Gen {
    threshold?: Value | number
    ratio?: Value | number
    attack?: Value | number
    release?: Value | number
    in?: Value.Audio
    sidechain?: Value.Audio
  }
  export interface Daverb extends Gen {
    in?: Value.Audio
    pd?: Value | number
    bw?: Value | number
    fi?: Value | number
    si?: Value | number
    dc?: Value | number
    ft?: Value | number
    st?: Value | number
    dp?: Value | number
    ex?: Value | number
    ed?: Value | number
  }
  export interface Dcc extends Gen {
    ceil?: Value | number
    in?: Value.Audio
    sample?: Value | number
  }
  export interface Dclip extends Gen {
    in?: Value.Audio
  }
  export interface Dclipexp extends Gen {
    factor?: Value | number
    in?: Value.Audio
  }
  export interface Dcliplin extends Gen {
    threshold?: Value | number
    factor?: Value | number
    in?: Value.Audio
  }
  export interface Delay extends Gen {
    ms?: Value | number
    fb?: Value | number
    in?: Value.Audio
  }
  export interface Diode extends Gen {
    cut?: Value | number
    hpf?: Value | number
    sat?: Value | number
    q?: Value | number
    in?: Value.Audio
  }
  export interface Exp extends Osc {

  }
  export interface Freesound extends Smp {
    id?: string
  }
  export interface Gen {
    gain?: Value | number
  }
  export interface Gendy extends Gen {
    step?: Value | number
  }
  export interface Grain extends Gen {
    amt?: Value | number
  }
  export interface Inc extends Gen {
    amt?: Value | number
    trig?: Value | number
  }
  export interface Lp extends Gen {
    cut?: Value | number
    in?: Value.Audio
  }
  export interface Mhp extends Moog {
    cut?: Value | number
    q?: Value | number
  }
  export interface Mlp extends Moog {
    cut?: Value | number
    q?: Value | number
  }
  export interface Moog extends Gen {
    in?: Value.Audio
  }
  export interface Noi extends Osc {

  }
  export interface Nrate extends Gen {
    normal?: Value | number
  }
  export interface Osc extends Gen {
    hz?: Value | number
    trig?: Value | number
    offset?: Value | number
  }
  export interface Ramp extends Aosc {

  }
  export interface Rate extends Gen {
    samples?: Value | number
  }
  export interface Sap extends Svf {
    cut?: Value | number
    q?: Value | number
  }
  export interface Saw extends Aosc {

  }
  export interface Say extends Smp {
    text?: string
  }
  export interface Sbp extends Svf {
    cut?: Value | number
    q?: Value | number
  }
  export interface Shp extends Svf {
    cut?: Value | number
    q?: Value | number
  }
  export interface Sin extends Osc {

  }
  export interface Slp extends Svf {
    cut?: Value | number
    q?: Value | number
  }
  export interface Smp extends Gen {
    offset?: Value | number
    length?: Value | number
    trig?: Value | number
  }
  export interface Sno extends Svf {
    cut?: Value | number
    q?: Value | number
  }
  export interface Spk extends Svf {
    cut?: Value | number
    q?: Value | number
  }
  export interface Sqr extends Aosc {

  }
  export interface Svf extends Gen {
    in?: Value.Audio
  }
  export interface Tanh extends Gen {
    in?: Value.Audio
  }
  export interface Tanha extends Gen {
    in?: Value.Audio
  }
  export interface Tap extends Gen {
    ms?: Value | number
    in?: Value.Audio
  }
  export interface Tri extends Aosc {

  }
  export interface Zero extends Gen {

  }
}

export interface Gen {
  adsr: (p: Props.Adsr) => Value.Audio
  aosc: (p: Props.Aosc) => Value.Audio
  atan: (p: Props.Atan) => Value.Audio
  bap: (p: Props.Bap) => Value.Audio
  bbp: (p: Props.Bbp) => Value.Audio
  bhp: (p: Props.Bhp) => Value.Audio
  bhs: (p: Props.Bhs) => Value.Audio
  biquad: (p: Props.Biquad) => Value.Audio
  blp: (p: Props.Blp) => Value.Audio
  bls: (p: Props.Bls) => Value.Audio
  bno: (p: Props.Bno) => Value.Audio
  bpk: (p: Props.Bpk) => Value.Audio
  clamp: (p: Props.Clamp) => Value.Audio
  clip: (p: Props.Clip) => Value.Audio
  comp: (p: Props.Comp) => Value.Audio
  daverb: (p: Props.Daverb) => [Value.Audio, Value.Audio]
  dcc: (p: Props.Dcc) => Value.Audio
  dclip: (p: Props.Dclip) => Value.Audio
  dclipexp: (p: Props.Dclipexp) => Value.Audio
  dcliplin: (p: Props.Dcliplin) => Value.Audio
  delay: (p: Props.Delay) => Value.Audio
  diode: (p: Props.Diode) => Value.Audio
  exp: (p: Props.Exp) => Value.Audio
  freesound: (p: Props.Freesound) => Value.Audio
  gen: (p: Props.Gen) => [Value.Audio, Value.Audio]
  gendy: (p: Props.Gendy) => Value.Audio
  grain: (p: Props.Grain) => Value.Audio
  inc: (p: Props.Inc) => Value.Audio
  lp: (p: Props.Lp) => Value.Audio
  mhp: (p: Props.Mhp) => Value.Audio
  mlp: (p: Props.Mlp) => Value.Audio
  moog: (p: Props.Moog) => void
  noi: (p: Props.Noi) => Value.Audio
  nrate: (p: Props.Nrate) => void
  osc: (p: Props.Osc) => Value.Audio
  ramp: (p: Props.Ramp) => Value.Audio
  rate: (p: Props.Rate) => void
  sap: (p: Props.Sap) => Value.Audio
  saw: (p: Props.Saw) => Value.Audio
  say: (p: Props.Say) => Value.Audio
  sbp: (p: Props.Sbp) => Value.Audio
  shp: (p: Props.Shp) => Value.Audio
  sin: (p: Props.Sin) => Value.Audio
  slp: (p: Props.Slp) => Value.Audio
  smp: (p: Props.Smp) => Value.Audio
  sno: (p: Props.Sno) => Value.Audio
  spk: (p: Props.Spk) => Value.Audio
  sqr: (p: Props.Sqr) => Value.Audio
  svf: (p: Props.Svf) => void
  tanh: (p: Props.Tanh) => Value.Audio
  tanha: (p: Props.Tanha) => Value.Audio
  tap: (p: Props.Tap) => Value.Audio
  tri: (p: Props.Tri) => Value.Audio
  zero: (p: Props.Zero) => Value.Audio
}
