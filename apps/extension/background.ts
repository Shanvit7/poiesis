import { runGate as runHeuristicGate } from "~lib/heuristic-gate"
import { createLogger } from "~lib/logger"
import {
  isMemoryGateAvailable,
  resetMemoryGateCache,
  runGate as runMemoryGate,
} from "~lib/memory-gate"
import { incrementStats } from "~lib/stats"
import type { ExtensionMessage, GateResult } from "~lib/types"
import type { CapturePayload } from "~schemas/capture.schema"
import { probeSupermemory } from "~services/http"
import { memoryService } from "~services/memory.service"

const logger = createLogger("background")

// ── Gate availability cache ───────────────────────────────────────────────────
// Reset on startup/install so we re-probe fresh each SW lifetime.

const resetGateCache = () => {
  resetMemoryGateCache()
}

chrome.runtime.onStartup.addListener(resetGateCache)
chrome.runtime.onInstalled.addListener(() => {
  resetGateCache()
  void runOnboarding()
})

// ── Onboarding probe ─────────────────────────────────────────────────────────
// Probe Supermemory Cloud on install. If unreachable or apiKey is empty,
// user must open Options and paste their Supermemory API key.

const runOnboarding = async () => {
  const reachable = await probeSupermemory()
  if (!reachable) {
    logger.warn({}, "Supermemory not reachable — user must configure API key")
  } else {
    logger.info({}, "Supermemory reachable")
  }
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type !== "CAPTURE") return
  void handleCapture(message.payload)
})

// ── Capture handler ───────────────────────────────────────────────────────────

const handleCapture = async (rawPayload: unknown): Promise<void> => {
  // ponytail: manual guard instead of Zod — Parcel can't bundle Zod v4 in SW context.
  if (!isCapturePayload(rawPayload)) {
    logger.warn({ rawPayload }, "invalid capture payload")
    return
  }
  const payload = rawPayload

  logger.info(
    { videoId: payload.videoId, watchPercent: payload.watchPercent },
    `gate check: "${payload.title}"`
  )

  // Clear badge before gate runs
  chrome.action.setBadgeText({ text: "" })

  // Load threshold from storage
  const { gateThreshold = 0.6, containerTag = "user_default" } = await chrome.storage.local.get({
    gateThreshold: 0.6,
    containerTag: "user_default",
  })

  // ── Gate dispatch ─────────────────────────────────────────────────────────
  let result: GateResult

  const aiReady = await isMemoryGateAvailable()

  if (aiReady) {
    try {
      result = await runMemoryGate(payload)
      logger.info({ score: result.score, reason: result.reason }, "Memory Gate result")
    } catch (err) {
      logger.error({ err }, "Memory Gate threw — falling back to heuristic")
      result = await runHeuristicGate(payload)
    }
  } else {
    logger.warn({}, "Memory Gate unavailable — heuristic gate active")
    result = await runHeuristicGate(payload)
  }

  logger.info(
    { videoId: payload.videoId, score: result.score, source: result.source, gateThreshold },
    `gate: ${result.source}`
  )

  // ── Threshold check ───────────────────────────────────────────────────────
  if (result.score < (gateThreshold as number)) {
    logger.debug({ title: payload.title, score: result.score }, "gate: drop")
    setBadge("–", "#ef4444")
    return
  }

  // ── Persist via SDK ───────────────────────────────────────────────────────
  try {
    await memoryService.add(payload, {
      valueScore: result.score,
      gateReason: result.reason,
      gateSource: result.source,
      watchedAt: new Date().toISOString(),
      containerTag: containerTag as string,
    })

    setBadge("✓", "#22c55e")
    await incrementStats()
    logger.info({ videoId: payload.videoId, source: result.source }, "memory saved")
  } catch (err) {
    logger.error({ err, videoId: payload.videoId }, "SDK write failed")
    setBadge("!", "#f59e0b")
  }
}

// ── Minimal type guard (ponytail: replaces Zod safeParse) ─────────────────────
const isCapturePayload = (v: unknown): v is CapturePayload => {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.videoId === "string" && o.videoId.length > 0
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const setBadge = (text: string, color: string) => {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
}
