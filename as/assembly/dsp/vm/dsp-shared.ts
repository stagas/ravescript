export enum SoundValueKind {
  Null,
  I32,
  Floats,
  Literal,
  Scalar,
  Audio,
  Dynamic,
}

export enum DspBinaryOp {
  // math: commutative
  Add,
  Mul,

  // math: non-commutative
  Sub,
  Div,
  Pow,
}

export class SoundData {
  constructor() { }
  begin: u32 = 0
  end: u32 = 0
  pan: f32 = 0
}
