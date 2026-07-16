import {
  object,
  string,
  number,
  picklist,
  pipe,
  minLength,
  url,
  minValue,
  maxValue,
  safeParse,
  infer,
  type Output,
} from "valibot"

import { AI_PROVIDERS, SUPERMEMORY_BASE_URL } from "~lib/constants"

// ── Schema ────────────────────────────────────────────────────────────────────

const aiProviders = AI_PROVIDERS as [string, ...string[]]

export const settingsSchema = object({
  apiKey: pipe(string(), minLength(1, "API key is required")),
  aiProvider: picklist(aiProviders),
  aiApiKey: string(),
  baseURL: pipe(string(), url("Invalid base URL")),
  containerTag: pipe(string(), minLength(1, "Container tag is required")),
  gateThreshold: pipe(number(), minValue(0), maxValue(1)),
})

export type Settings = Output<typeof settingsSchema>

// ── Defaults ──────────────────────────────────────────────────────────────────

export const SETTINGS_DEFAULTS: Settings = {
  apiKey: "",
  aiProvider: "google",
  aiApiKey: "",
  baseURL: SUPERMEMORY_BASE_URL,
  containerTag: "user_default",
  gateThreshold: 0.6,
}

// ── Storage helpers ───────────────────────────────────────────────────────────

export const loadSettings = (): Promise<Settings> =>
  new Promise((resolve) =>
    chrome.storage.local.get(SETTINGS_DEFAULTS, (data) => resolve(data as Settings))
  )

export const saveSettings = (partial: Partial<Settings>): Promise<void> =>
  new Promise((resolve) => chrome.storage.local.set(partial, resolve))

// ── Validation ────────────────────────────────────────────────────────────────

export const validateSettings = (data: unknown) => {
  const result = safeParse(settingsSchema, data)
  if (result.success) return { success: true as const, data: result.output }

  const errors: Partial<Record<keyof Settings, string>> = {}
  for (const issue of result.issues) {
    const key = issue.path?.[0]?.key as keyof Settings
    if (key && !errors[key]) errors[key] = issue.message
  }
  return { success: false as const, errors }
}
