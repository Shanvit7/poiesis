export interface VideoPayload {
  videoId: string | null
  url: string
  title: string
  channel: string
  durationSeconds: number
  playedSeconds: number // actual playback time, excludes seeking
  watchPercent: number // 0–1
  capturedAt: string // ISO string
}

export type ExtensionMessage = { type: "VIDEO_CAPTURED"; payload: VideoPayload }
