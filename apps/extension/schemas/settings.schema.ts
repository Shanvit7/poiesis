import { z } from "zod"

import { AI_PROVIDERS, SUPERMEMORY_BASE_URL, type AiProvider } from "~lib/constants"

export const settingsSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  aiProvider: z.enum(AI_PROVIDERS as [AiProvider, ...AiProvider[]]).default("google"),
  aiApiKey: z.string().default(""), // key for the selected aiProvider — Ask tab only
  baseURL: z.string().url().default(SUPERMEMORY_BASE_URL), // advanced override
  containerTag: z.string().min(1).default("user_default"),
  gateThreshold: z.number().min(0).max(1).default(0.6),
})

export type Settings = z.infer<typeof settingsSchema>
