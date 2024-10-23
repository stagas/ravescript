import { Adsr } from '../../as/assembly/dsp/gen/adsr'
import { Aosc } from '../../as/assembly/dsp/gen/aosc'
import { Atan } from '../../as/assembly/dsp/gen/atan'
import { Bap } from '../../as/assembly/dsp/gen/bap'
import { Bbp } from '../../as/assembly/dsp/gen/bbp'
import { Bhp } from '../../as/assembly/dsp/gen/bhp'
import { Bhs } from '../../as/assembly/dsp/gen/bhs'
import { Biquad } from '../../as/assembly/dsp/gen/biquad'
import { Blp } from '../../as/assembly/dsp/gen/blp'
import { Bls } from '../../as/assembly/dsp/gen/bls'
import { Bno } from '../../as/assembly/dsp/gen/bno'
import { Bpk } from '../../as/assembly/dsp/gen/bpk'
import { Clamp } from '../../as/assembly/dsp/gen/clamp'
import { Clip } from '../../as/assembly/dsp/gen/clip'
import { Comp } from '../../as/assembly/dsp/gen/comp'
import { Daverb } from '../../as/assembly/dsp/gen/daverb'
import { Dcc } from '../../as/assembly/dsp/gen/dcc'
import { Dclip } from '../../as/assembly/dsp/gen/dclip'
import { Dclipexp } from '../../as/assembly/dsp/gen/dclipexp'
import { Dcliplin } from '../../as/assembly/dsp/gen/dcliplin'
import { Delay } from '../../as/assembly/dsp/gen/delay'
import { Diode } from '../../as/assembly/dsp/gen/diode'
import { Exp } from '../../as/assembly/dsp/gen/exp'
import { Freesound } from '../../as/assembly/dsp/gen/freesound'
import { Gen } from '../../as/assembly/dsp/gen/gen'
import { Gendy } from '../../as/assembly/dsp/gen/gendy'
import { Grain } from '../../as/assembly/dsp/gen/grain'
import { Inc } from '../../as/assembly/dsp/gen/inc'
import { Lp } from '../../as/assembly/dsp/gen/lp'
import { Mhp } from '../../as/assembly/dsp/gen/mhp'
import { Mlp } from '../../as/assembly/dsp/gen/mlp'
import { Moog } from '../../as/assembly/dsp/gen/moog'
import { Noi } from '../../as/assembly/dsp/gen/noi'
import { Nrate } from '../../as/assembly/dsp/gen/nrate'
import { Osc } from '../../as/assembly/dsp/gen/osc'
import { Ramp } from '../../as/assembly/dsp/gen/ramp'
import { Rate } from '../../as/assembly/dsp/gen/rate'
import { Sap } from '../../as/assembly/dsp/gen/sap'
import { Saw } from '../../as/assembly/dsp/gen/saw'
import { Say } from '../../as/assembly/dsp/gen/say'
import { Sbp } from '../../as/assembly/dsp/gen/sbp'
import { Shp } from '../../as/assembly/dsp/gen/shp'
import { Sin } from '../../as/assembly/dsp/gen/sin'
import { Slp } from '../../as/assembly/dsp/gen/slp'
import { Smp } from '../../as/assembly/dsp/gen/smp'
import { Sno } from '../../as/assembly/dsp/gen/sno'
import { Spk } from '../../as/assembly/dsp/gen/spk'
import { Sqr } from '../../as/assembly/dsp/gen/sqr'
import { Svf } from '../../as/assembly/dsp/gen/svf'
import { Tanh } from '../../as/assembly/dsp/gen/tanh'
import { Tanha } from '../../as/assembly/dsp/gen/tanha'
import { Tap } from '../../as/assembly/dsp/gen/tap'
import { Tri } from '../../as/assembly/dsp/gen/tri'
import { Zero } from '../../as/assembly/dsp/gen/zero'
export const Offsets: usize[][] = [
  [offsetof<Gen>('gain'),offsetof<Adsr>('attack'),offsetof<Adsr>('decay'),offsetof<Adsr>('sustain'),offsetof<Adsr>('release'),offsetof<Adsr>('on'),offsetof<Adsr>('off')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Atan>('in')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Bap>('cut'),offsetof<Bap>('q')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Bbp>('cut'),offsetof<Bbp>('q')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Bhp>('cut'),offsetof<Bhp>('q')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Bhs>('cut'),offsetof<Bhs>('q'),offsetof<Bhs>('amt')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Blp>('cut'),offsetof<Blp>('q')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Bls>('cut'),offsetof<Bls>('q'),offsetof<Bls>('amt')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Bno>('cut'),offsetof<Bno>('q')],
  [offsetof<Gen>('gain'),offsetof<Biquad>('in'),offsetof<Bpk>('cut'),offsetof<Bpk>('q'),offsetof<Bpk>('amt')],
  [offsetof<Gen>('gain'),offsetof<Clamp>('min'),offsetof<Clamp>('max'),offsetof<Clamp>('in')],
  [offsetof<Gen>('gain'),offsetof<Clip>('threshold'),offsetof<Clip>('in')],
  [offsetof<Gen>('gain'),offsetof<Comp>('threshold'),offsetof<Comp>('ratio'),offsetof<Comp>('attack'),offsetof<Comp>('release'),offsetof<Comp>('in'),offsetof<Comp>('sidechain')],
  [offsetof<Gen>('gain'),offsetof<Daverb>('in'),offsetof<Daverb>('pd'),offsetof<Daverb>('bw'),offsetof<Daverb>('fi'),offsetof<Daverb>('si'),offsetof<Daverb>('dc'),offsetof<Daverb>('ft'),offsetof<Daverb>('st'),offsetof<Daverb>('dp'),offsetof<Daverb>('ex'),offsetof<Daverb>('ed')],
  [offsetof<Gen>('gain'),offsetof<Dcc>('ceil'),offsetof<Dcc>('in'),offsetof<Dcc>('sample')],
  [offsetof<Gen>('gain'),offsetof<Dclip>('in')],
  [offsetof<Gen>('gain'),offsetof<Dclipexp>('factor'),offsetof<Dclipexp>('in')],
  [offsetof<Gen>('gain'),offsetof<Dcliplin>('threshold'),offsetof<Dcliplin>('factor'),offsetof<Dcliplin>('in')],
  [offsetof<Gen>('gain'),offsetof<Delay>('ms'),offsetof<Delay>('fb'),offsetof<Delay>('in')],
  [offsetof<Gen>('gain'),offsetof<Diode>('cut'),offsetof<Diode>('hpf'),offsetof<Diode>('sat'),offsetof<Diode>('q'),offsetof<Diode>('in')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Smp>('offset'),offsetof<Smp>('length'),offsetof<Smp>('trig'),offsetof<Freesound>('id')],
  [offsetof<Gen>('gain')],
  [offsetof<Gen>('gain'),offsetof<Gendy>('step')],
  [offsetof<Gen>('gain'),offsetof<Grain>('amt')],
  [offsetof<Gen>('gain'),offsetof<Inc>('amt'),offsetof<Inc>('trig')],
  [offsetof<Gen>('gain'),offsetof<Lp>('cut'),offsetof<Lp>('in')],
  [offsetof<Gen>('gain'),offsetof<Moog>('in'),offsetof<Mhp>('cut'),offsetof<Mhp>('q')],
  [offsetof<Gen>('gain'),offsetof<Moog>('in'),offsetof<Mlp>('cut'),offsetof<Mlp>('q')],
  [offsetof<Gen>('gain'),offsetof<Moog>('in')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Nrate>('normal')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Rate>('samples')],
  [offsetof<Gen>('gain'),offsetof<Svf>('in'),offsetof<Sap>('cut'),offsetof<Sap>('q')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Smp>('offset'),offsetof<Smp>('length'),offsetof<Smp>('trig'),offsetof<Say>('text')],
  [offsetof<Gen>('gain'),offsetof<Svf>('in'),offsetof<Sbp>('cut'),offsetof<Sbp>('q')],
  [offsetof<Gen>('gain'),offsetof<Svf>('in'),offsetof<Shp>('cut'),offsetof<Shp>('q')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Svf>('in'),offsetof<Slp>('cut'),offsetof<Slp>('q')],
  [offsetof<Gen>('gain'),offsetof<Smp>('offset'),offsetof<Smp>('length'),offsetof<Smp>('trig')],
  [offsetof<Gen>('gain'),offsetof<Svf>('in'),offsetof<Sno>('cut'),offsetof<Sno>('q')],
  [offsetof<Gen>('gain'),offsetof<Svf>('in'),offsetof<Spk>('cut'),offsetof<Spk>('q')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain'),offsetof<Svf>('in')],
  [offsetof<Gen>('gain'),offsetof<Tanh>('in')],
  [offsetof<Gen>('gain'),offsetof<Tanha>('in')],
  [offsetof<Gen>('gain'),offsetof<Tap>('ms'),offsetof<Tap>('in')],
  [offsetof<Gen>('gain'),offsetof<Osc>('hz'),offsetof<Osc>('trig'),offsetof<Osc>('offset')],
  [offsetof<Gen>('gain')]
]