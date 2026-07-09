import type { VideoPayload } from "~lib/types"

// Score must reach this to store. Conservative by design —
// a false negative (missed save) beats noise in the user's memory.
export const STORE_THRESHOLD = 30

// ── Signal keyword lists ──────────────────────────────────────────────────────

const TITLE_POSITIVE = [
  "tutorial",
  "how to",
  "howto",
  "course",
  "lecture",
  "explained",
  "guide",
  "learn",
  "lesson",
  "workshop",
  "masterclass",
  "deep dive",
  "introduction to",
  "intro to",
  "beginner",
  "advanced",
  "complete",
  "step by step",
  "tips",
  "fundamentals",
  "overview",
  "walkthrough",
  "crash course",
  "from scratch",
  "in depth",
  "breakdown",
]

const TITLE_NEGATIVE = [
  "music video",
  "official video",
  "official audio",
  "lyrics",
  "lyric video",
  "reaction",
  "reacts",
  "vlog",
  "highlights",
  "trailer",
  "#shorts",
  "funny",
  "meme",
  "compilation",
  "roast",
  "challenge",
]

const CHANNEL_PATTERNS = [
  /academy/i,
  /university/i,
  /\bschool\b/i,
  /learning/i,
  /education/i,
  /tutorial/i,
  /\btech\b/i,
  /science/i,
  /explained/i,
  /\bdev\b/i,
  /engineering/i,
  /institute/i,
]

// ── Scorer ────────────────────────────────────────────────────────────────────

export const scorePayload = (p: VideoPayload): number => {
  let score = 0

  // Infer total duration when durationSeconds isn't populated yet
  const totalDuration =
    p.durationSeconds > 0
      ? p.durationSeconds
      : p.watchPercent > 0
        ? p.playedSeconds / p.watchPercent
        : p.playedSeconds

  // ── A: Absolute engagement ─────────────────────────────────────────────────
  // The −30 for < 90s is not a hard gate — but makes passing without strong
  // semantic signals essentially impossible in practice.
  if (p.playedSeconds >= 600) score += 25
  else if (p.playedSeconds >= 300) score += 15
  else if (p.playedSeconds >= 120) score += 5
  else score -= 30

  // ── B: Duration context ────────────────────────────────────────────────────
  // Long videos signal structured, dense content (lectures, courses, talks).
  // Short videos are ambiguous at best.
  if (totalDuration >= 3600) score += 25
  else if (totalDuration >= 1800) score += 18
  else if (totalDuration >= 600) score += 10
  else if (totalDuration >= 180) score += 3
  else score -= 20

  // ── C: Completion relative to duration ────────────────────────────────────
  // 20% of a 2hr lecture (= 24 min) outweighs 80% of a 3min music clip.
  if (p.watchPercent >= 0.8) score += 12
  else if (p.watchPercent >= 0.5) score += 8
  else if (p.watchPercent >= 0.3 && p.playedSeconds >= 300) score += 8
  else if (p.watchPercent >= 0.2 && p.playedSeconds >= 600) score += 8
  else if (p.watchPercent < 0.1) score -= 10

  // ── D: Title semantics ─────────────────────────────────────────────────────
  const title = p.title.toLowerCase()

  const posMatches = TITLE_POSITIVE.filter((kw) => title.includes(kw)).length
  const negMatches = TITLE_NEGATIVE.filter((kw) => title.includes(kw)).length

  if (posMatches > 0) score += Math.min(20 + (posMatches - 1) * 5, 30)
  if (negMatches > 0) score -= Math.min(25 + (negMatches - 1) * 10, 40)

  // ── E: Channel name patterns ───────────────────────────────────────────────
  if (CHANNEL_PATTERNS.some((re) => re.test(p.channel))) score += 10

  // ── F: Description structure ───────────────────────────────────────────────
  // Timestamps (e.g. "0:00 Intro", "12:34 Chapter") reliably mark structured content.
  if (/\d+:\d+/.test(p.description)) score += 20
  if (/https?:\/\//.test(p.description)) score += 5

  return score
}

export const passesHeuristicGate = (p: VideoPayload): boolean => scorePayload(p) >= STORE_THRESHOLD
