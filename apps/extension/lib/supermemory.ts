import { SUPERMEMORY_BASE_URL } from "~lib/constants"
import { createLogger } from "~lib/logger"

const logger = createLogger("supermemory")

// ── Client cache ──────────────────────────────────────────────────────────────
let cachedClient: unknown | null = null
let cachedApiKey: string | null = null

// ── SDK singleton ─────────────────────────────────────────────────────────────
// Dynamic import — Supermemory SDK must NOT be loaded at module init in
// extension renderer contexts (sidepanel/popup). Lazy-load on first call.

export const getSupermemoryClient = async () => {
  const { apiKey = "", baseURL = SUPERMEMORY_BASE_URL } = await chrome.storage.local.get({
    apiKey: "",
    baseURL: SUPERMEMORY_BASE_URL,
  })

  if (cachedClient && cachedApiKey === apiKey) {
    return cachedClient
  }

  logger.info({ baseURL }, "creating Supermemory client")

  // ponytail: dynamic import avoids renderer crash from SDK module init
  const { default: Supermemory } = await import("supermemory")

  cachedClient = new Supermemory({
    apiKey: apiKey as string,
    baseURL: (baseURL as string) || SUPERMEMORY_BASE_URL,
  })
  cachedApiKey = apiKey as string

  return cachedClient
}

// ── Invalidate cache (e.g. when storage changes) ──────────────────────────────
export const invalidateSupermemoryClient = () => {
  cachedClient = null
  cachedApiKey = null
}
