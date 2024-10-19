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
