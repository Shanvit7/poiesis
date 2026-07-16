import type { CaptureStats } from "~lib/types"

// ── Capture stats helpers ─────────────────────────────────────────────────────
// Mirror of loadSettings/saveSettings — promise-wrapped, typed, zero raw
// chrome.storage calls outside this module.

/** Returns the storage key for today's saved-count, e.g. `savedToday_2026-07-13`. */
export const todayKey = (): string => `savedToday_${new Date().toISOString().slice(0, 10)}`

/** Read `lastSavedAt` + `savedToday` (today's count) from local storage. */
export const loadStats = (): Promise<CaptureStats> => {
  const key = todayKey()
  return new Promise((resolve) =>
    chrome.storage.local.get({ lastSavedAt: undefined, [key]: 0 }, (data) =>
      resolve({
        lastSavedAt: (data.lastSavedAt as string | undefined) ?? undefined,
        savedToday: (data[key] as number) ?? 0,
      })
    )
  )
}

/** Increment today's saved count and stamp `lastSavedAt` with the current time. */
export const incrementStats = async (): Promise<void> => {
  const key = todayKey()
  const { savedToday = 0 } = await loadStats()
  const next = savedToday + 1
  await new Promise<void>((resolve) =>
    chrome.storage.local.set(
      { lastSavedAt: new Date().toISOString(), [key]: next, savedToday: next },
      resolve
    )
  )
}
