import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useRef } from "react"

import type { ExtensionMessage, VideoPayload } from "~lib/types"

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/watch*"],
}

// --- Heuristics thresholds ---
// These decide whether a video is worth capturing at all.
// Tune these as we learn more about what users actually watch.
const THRESHOLDS = {
  minDurationSeconds: 180, // ignore anything under 3 min (music, clips)
  minWatchPercent: 0.5, // user must have watched at least 50%
  minPlayedSeconds: 90, // at least 90s of real playback (not seeking)
} as const

// --- Metadata extraction ---
// YouTube's DOM is unstable — selectors change between page versions.
// We try multiple selectors and fall back gracefully.

const getVideoId = (): string | null => new URLSearchParams(window.location.search).get("v")

const getTitle = (): string =>
  document.title
    .replace(/^\(\d+\)\s+/, "") // strip notification badge e.g. "(3) "
    .replace(/ - YouTube$/, "")
    .trim()

const getChannel = (): string =>
  (
    document.querySelector<HTMLElement>("ytd-channel-name yt-formatted-string a")?.textContent ??
    document.querySelector<HTMLElement>("#channel-name a")?.textContent ??
    document.querySelector<HTMLElement>("#owner-name a")?.textContent ??
    ""
  ).trim()

// --- Heuristics check ---

const shouldCapture = (
  durationSeconds: number,
  watchPercent: number,
  playedSeconds: number
): boolean => {
  if (durationSeconds < THRESHOLDS.minDurationSeconds) return false
  if (watchPercent < THRESHOLDS.minWatchPercent) return false
  if (playedSeconds < THRESHOLDS.minPlayedSeconds) return false
  return true
}

// --- Video tracker ---
// Attaches to a <video> element and monitors actual playback.
// Returns a cleanup function to detach listeners.

const attachTracker = (
  video: HTMLVideoElement,
  onCapture: (payload: VideoPayload) => void
): (() => void) => {
  let reported = false
  let playedSeconds = 0
  let lastTime = video.currentTime

  const onTimeUpdate = () => {
    if (reported) return

    const now = video.currentTime
    const delta = now - lastTime

    // Only count genuine forward playback.
    // A delta > 2s means the user seeked — don't count that.
    if (delta > 0 && delta < 2) {
      playedSeconds += delta
    }
    lastTime = now

    const watchPercent = video.duration > 0 ? now / video.duration : 0

    if (shouldCapture(video.duration, watchPercent, playedSeconds)) {
      reported = true
      onCapture({
        videoId: getVideoId(),
        url: window.location.href,
        title: getTitle(),
        channel: getChannel(),
        durationSeconds: Math.round(video.duration),
        playedSeconds: Math.round(playedSeconds),
        watchPercent: Math.round(watchPercent * 100) / 100,
        capturedAt: new Date().toISOString(),
      })
    }
  }

  video.addEventListener("timeupdate", onTimeUpdate)
  return () => video.removeEventListener("timeupdate", onTimeUpdate)
}

// --- Wait for video element ---
// On SPA navigation the <video> element may not be in the DOM immediately.
// We use a MutationObserver to wait for it rather than polling with setTimeout.

const waitForVideo = (onReady: (video: HTMLVideoElement) => () => void): (() => void) => {
  const existing = document.querySelector<HTMLVideoElement>("video")
  if (existing) return onReady(existing)

  let detach: (() => void) | null = null

  const observer = new MutationObserver(() => {
    const video = document.querySelector<HTMLVideoElement>("video")
    if (!video) return
    observer.disconnect()
    detach = onReady(video)
  })

  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    detach?.()
  }
}

// --- Component ---
// Returns null — no UI. All the work happens in the effect.

export default function YouTubeTracker() {
  const detachRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const onCapture = (payload: VideoPayload) => {
      const message: ExtensionMessage = { type: "VIDEO_CAPTURED", payload }
      chrome.runtime.sendMessage(message)
    }

    const startTracking = () => {
      // Clean up previous video's listeners before starting fresh
      detachRef.current?.()
      detachRef.current = waitForVideo((video) => attachTracker(video, onCapture))
    }

    // YouTube is a SPA. It fires this event on every client-side navigation.
    document.addEventListener("yt-navigate-finish", startTracking)

    // Handle the initial page load — yt-navigate-finish won't fire for this.
    startTracking()

    return () => {
      document.removeEventListener("yt-navigate-finish", startTracking)
      detachRef.current?.()
    }
  }, [])

  return null
}
