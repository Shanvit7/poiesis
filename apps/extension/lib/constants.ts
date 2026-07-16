// ── Extension-wide constants ──────────────────────────────────────────────────
// Never inline these strings elsewhere — always import from here.

export const SUPERMEMORY_BASE_URL = "https://api.supermemory.ai"

// Default model per AI provider for the Ask tab.
export const AI_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
  google: "gemini-2.0-flash",
} as const

export type AiProvider = keyof typeof AI_MODELS
export const AI_PROVIDERS: AiProvider[] = ["openai", "anthropic", "google"]

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
}

export const AI_KEY_PLACEHOLDERS: Record<AiProvider, string> = {
  openai: "sk-… from platform.openai.com",
  anthropic: "sk-ant-… from console.anthropic.com",
  google: "AIza… from aistudio.google.com",
}
