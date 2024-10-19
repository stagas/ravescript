@unmanaged
export class Track {
  run_ops$: usize = 0
  setup_ops$: usize = 0
  literals$: usize = 0
  lists$: usize = 0
  audio_LR$: i32 = 0
}

@unmanaged
export class Out {
  L$: usize = 0
  R$: usize = 0
}
