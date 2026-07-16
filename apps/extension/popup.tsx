import "~globals.css"

import { useEffect, useState } from "react"

import { loadStats } from "~lib/stats"

interface PopupState {
  lastSavedAt: string | null
  savedToday: number
}

// Logo wordmark — matches assets/logo.svg
const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 40"
    fill="none"
    aria-label="Poiesis"
    className="h-7 w-auto"
  >
    <title>Poiesis</title>
    <text
      x="0"
      y="28"
      fontFamily="'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
      fontSize="22"
      fontWeight="600"
      letterSpacing="-0.4"
      className="fill-primary"
    >
      Poiesis
    </text>
  </svg>
)

export default function Popup() {
  const [state, setState] = useState<PopupState>({
    lastSavedAt: null,
    savedToday: 0,
  })

  useEffect(() => {
    void loadStats().then(({ lastSavedAt = null, savedToday = 0 }) =>
      setState((prev) => ({ ...prev, lastSavedAt, savedToday }))
    )
  }, [])

  const openSidePanel = () => {
    chrome.windows.getCurrent(({ id }) => {
      if (id !== undefined) {
        chrome.sidePanel.open({ windowId: id })
        window.close()
      }
    })
  }

  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  const formatLastSaved = (iso: string | null): string => {
    if (!iso) return "Never"
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="w-72 p-5">
      {/* Header with logo */}
      <div className="mb-5">
        <Logo />
      </div>

      {/* Open panel CTA */}
      <button
        type="button"
        onClick={openSidePanel}
        className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2 rounded-lg transition-colors mb-4"
      >
        Open Memory Panel
      </button>

      {/* Stats */}
      <div className="flex justify-between text-xs text-fg-3 mb-4 px-1">
        <span>Last saved: {formatLastSaved(state.lastSavedAt)}</span>
        <span>
          Today: {state.savedToday} video{state.savedToday !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Settings link */}
      <button
        type="button"
        onClick={openSettings}
        className="w-full text-xs text-fg-3 hover:text-fg py-2 transition-colors"
      >
        Settings
      </button>
    </div>
  )
}
