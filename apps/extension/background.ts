import { classifyMemoryGate, isAiAvailable } from "~lib/ai-memory-gate"
import { STORE_THRESHOLD, scorePayload } from "~lib/heuristic-gate"
import { createLogger } from "~lib/logger"
import type { CapturePayload, ExtensionMessage, VideoPayload } from "~lib/types"
import { MemoryError, memoryService } from "~services/memory.service"

const logger = createLogger("background")

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type !== "VIDEO_CAPTURED") return
  handleCapture(message.payload)
})

// ── Capture handler ───────────────────────────────────────────────────────────
// Gate order: AI first → heuristic fallback (only when AI is unavailable/throws).
// VideoPayload is rich context used only for local gate evaluation — never sent
// to the backend. Backend derives metadata from videoId via yt-dlp.

const handleCapture = async (payload: VideoPayload): Promise<void> => {
  if (!payload.videoId) {
    logger.warn({}, "no videoId — skipping")
    return
  }

  logger.info(
    { videoId: payload.videoId, watchPercent: payload.watchPercent },
    `gate check: "${payload.title}"`
  )

  // ── [1] AI gate — primary path ─────────────────────────────────────────────
  const aiReady = await isAiAvailable()

  if (aiReady) {
    try {
      const result = await classifyMemoryGate(payload)

      if (!result.store) {
        logger.debug({ title: payload.title, confidence: result.confidence }, "AI gate: drop")
        return
      }

      logger.info({ title: payload.title, confidence: result.confidence }, "AI gate: store")
      await persist(payload, { gate: "ai", confidence: result.confidence })
      return
    } catch (err) {
      logger.error({ err }, "Gemini Nano failed — falling back to heuristic gate")
    }
  } else {
    logger.warn({}, "Gemini Nano unavailable — heuristic gate active")
  }

  // ── [2] Heuristic gate — fallback only ────────────────────────────────────
  const score = scorePayload(payload)

  if (score < STORE_THRESHOLD) {
    logger.debug({ title: payload.title, score }, "heuristic gate: drop")
    return
  }

  logger.info({ title: payload.title, score }, "heuristic gate: store")
  await persist(payload, { gate: "heuristic", gateScore: score })
}

// ── Persist ───────────────────────────────────────────────────────────────────
// Constructs the lean CapturePayload from gate evaluation context.
// Only watch behaviour + gate metadata leave the device — backend fetches
// title / channel / description / duration / transcript via yt-dlp.

const persist = async (
  payload: VideoPayload,
  gate: Pick<CapturePayload, "gate" | "confidence" | "gateScore">
): Promise<void> => {
  const capture: CapturePayload = {
    videoId: payload.videoId as string, // null guard already done in handleCapture
    playedSeconds: payload.playedSeconds,
    watchPercent: payload.watchPercent,
    capturedAt: new Date().toISOString(),
    ...gate,
  }

  try {
    await memoryService.capture(capture)
  } catch (error) {
    if (error instanceof MemoryError) {
      await queueLocally(capture)
      return
    }
    logger.error({ err: error }, "unexpected error during capture")
  }
}

// ── Local queue ───────────────────────────────────────────────────────────────

const queueLocally = async (capture: CapturePayload): Promise<void> => {
  const { queue = [] } = await chrome.storage.local.get({ queue: [] as CapturePayload[] })
  ;(queue as CapturePayload[]).push(capture)
  await chrome.storage.local.set({ queue })
  logger.info({ queueLength: (queue as CapturePayload[]).length }, "queued locally")
}
