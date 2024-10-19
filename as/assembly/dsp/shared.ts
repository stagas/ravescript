@unmanaged
export class PlayerTrack {
  sound$: usize = 0
  ops$: usize = 0
  notes$: usize = 0
  notesCount: u32 = 0
  params$: usize = 0
  paramsCount: u32 = 0
  audio_LR$: i32 = 0
  out$: usize = 0
}

@unmanaged
export class Out {
  L$: usize = 0
  R$: usize = 0
}
