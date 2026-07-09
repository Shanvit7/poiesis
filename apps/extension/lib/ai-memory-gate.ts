import { createLogger } from "~lib/logger"
import type { MemoryGateResult, VideoPayload } from "~lib/types"

const logger = createLogger("ai-memory-gate")

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are an AI memory gate inside a YouTube learning app.

Your ONLY job: decide whether this video is worth saving to the user's long-term memory.

SAVE (true):
  - Tutorials, walkthroughs, how-tos, technical deep-dives
  - Lectures, conference talks, educational documentaries
  - Product demos with clear instructional value
  - Dense interviews, structured podcasts, explainers

DO NOT SAVE (false):
  - Music, entertainment, reactions, commentary
  - News clips, sports highlights, vlogs, memes
  - Movie trailers, promotional content
  - Passive background-listening content

Use watch duration and completion % as engagement signals — not as pass/fail gates.
A user who watched 25% of a 3-hour lecture has shown meaningful engagement.

Respond ONLY with JSON: { "store": true } or { "store": false }.
Optionally include "confidence" as a float 0.0–1.0.
`.trim()

// ── Message builder ───────────────────────────────────────────────────────────

const buildUserMessage = (p: VideoPayload): string => {
  const lines = [
    `Title: "${p.title}"`,
    `Channel: "${p.channel}"`,
    `Description: "${p.description.slice(0, 500)}"`,
    `Watched: ${Math.round(p.playedSeconds)}s (${Math.round(p.watchPercent * 100)}% of video)`,
  ]
  return lines.join("\n")
}

// ── Availability check ────────────────────────────────────────────────────────
// Guards against Chrome versions where LanguageModel doesn't exist yet.

export const isAiAvailable = async (): Promise<boolean> => {
  if (typeof LanguageModel === "undefined") {
    logger.warn({}, "LanguageModel API not present — Chrome 138+ required")
    return false
  }
  try {
    const status = await LanguageModel.availability()
    if (status !== "available") {
      logger.warn({ status }, "Gemini Nano not ready")
    }
    return status === "available"
  } catch (err) {
    logger.warn({ err }, "LanguageModel.availability() threw")
    return false
  }
}

// ── Classifier ────────────────────────────────────────────────────────────────

export const classifyMemoryGate = async (payload: VideoPayload): Promise<MemoryGateResult> => {
  const session = await LanguageModel.create({
    initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
  })

  try {
    const raw = await session.prompt(buildUserMessage(payload), {
      responseConstraint: {
        type: "object",
        properties: {
          store: { type: "boolean" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["store"],
      },
    })
    return JSON.parse(raw) as MemoryGateResult
  } finally {
    session.destroy()
  }
}
