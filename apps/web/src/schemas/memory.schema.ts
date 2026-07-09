import { z } from "zod"

export const memorySchema = z.object({})

export type Memory = z.infer<typeof memorySchema>
