import { Struct } from 'utils'

export interface Note {
  n: number
  time: number
  length: number
  vel: number
}

export type NoteView = ReturnType<typeof NoteView>

export const NoteView = Struct({
  n: 'f32',
  time: 'f32',
  length: 'f32',
  vel: 'f32',
})
