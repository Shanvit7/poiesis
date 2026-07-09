import { createLogger } from "~lib/logger"
import type { ExtensionMessage, VideoPayload } from "~lib/types"
import { MemoryError, memoryService } from "~services/memory.service"

const logger = createLogger("background")

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type !== "VIDEO_CAPTURED") return
  handleCapture(message.payload)
})

// ── Capture handler ───────────────────────────────────────────────────────────

const handleCapture = async (payload: VideoPayload) => {
  logger.info(
    { videoId: payload.videoId, watchPercent: payload.watchPercent },
    `captured: "${payload.title}"`
  )

  try {
    await memoryService.capture(payload)
  } catch (error) {
    if (error instanceof MemoryError) {
      // Unauthenticated or backend unreachable — hold it locally until
      // the user logs in or connectivity is restored.
      await queueLocally(payload)
      return
    }
    logger.error({ err: error }, "unexpected error during capture")
  }
}

// ── Local queue ───────────────────────────────────────────────────────────────
// Payloads sit here when the user isn't logged in or the backend is down.
// The queue will be flushed once auth is wired up.

const queueLocally = async (payload: VideoPayload) => {
  const { queue = [] } = await chrome.storage.local.get({ queue: [] as VideoPayload[] })
  ;(queue as VideoPayload[]).push(payload)
  await chrome.storage.local.set({ queue })
  logger.info({ queueLength: (queue as VideoPayload[]).length }, "queued locally")
}
