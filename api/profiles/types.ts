import { z } from 'zod'

export type ProfileCreate = z.infer<typeof ProfileCreate>
export const ProfileCreate = z.object({
  nick: z.string(),
  displayName: z.string(),
  isDefault: z.coerce.boolean(),
})
