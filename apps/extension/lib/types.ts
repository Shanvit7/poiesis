// ── Internal gate payload ────────────────────────────────────────────────────
// Rich context used locally by the AI gate and heuristic scorer.
// Never sent to the backend — backend derives everything it needs from videoId.

export interface VideoPayload {
  videoId: string | null
  title: string
  channel: string
  description: string
  durationSeconds: number
  playedSeconds: number // actual playback time, excludes seeking
  watchPercent: number // 0–1
}

// ── Backend capture payload ───────────────────────────────────────────────────
// Lean. Only fields the backend cannot derive from videoId via yt-dlp.
// title / channel / description / duration / transcript → backend fetches them.

export interface CapturePayload {
  videoId: string // guaranteed non-null before persist is called
  playedSeconds: number
  watchPercent: number
  capturedAt: string // ISO string
  gate: "ai" | "heuristic"
  confidence?: number // AI confidence 0–1
  gateScore?: number // heuristic scorer total
}

export type ExtensionMessage = { type: "VIDEO_CAPTURED"; payload: VideoPayload }

// Returned by classifyMemoryGate
export interface MemoryGateResult {
  store: boolean
  confidence?: number
}
