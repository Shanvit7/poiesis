import { SUPERMEMORY_BASE_URL } from "~lib/constants"

// ── Health probe — only non-SDK network call to Supermemory ──────────────────
// Reads baseURL from chrome.storage.local; falls back to cloud default.

export const probeSupermemory = async (): Promise<boolean> => {
  const { baseURL = SUPERMEMORY_BASE_URL } = await chrome.storage.local.get({
    baseURL: SUPERMEMORY_BASE_URL,
  })
  try {
    const res = await fetch(`${baseURL as string}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}
