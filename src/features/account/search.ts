import { z } from 'zod'

/** `redirect` = href interno para retomar o fluxo após autenticar. */
export const authSearchSchema = z.object({
  redirect: z
    .string()
    .refine((v) => v.startsWith('/') && !v.startsWith('//'), 'redirect deve ser interno')
    .optional()
    .catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>
