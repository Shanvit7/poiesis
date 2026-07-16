import "~globals.css"

import { SettingsForm } from "~components/settings-form"

// Logo wordmark — matches assets/logo.svg
const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 40"
    fill="none"
    aria-label="Poiesis"
    className="h-8 w-auto"
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

export default function Options() {
  return (
    <div className="min-h-screen bg-bg flex items-start justify-center pt-12">
      <div className="bg-bg rounded-lg border border-line w-full max-w-md p-6">
        <div className="mb-6">
          <Logo />
          <p className="text-xs text-fg-3 mt-1">Settings</p>
        </div>

        <SettingsForm />

        <p className="text-xs text-fg-3 mt-4 text-center">
          Your memories live in your Supermemory account.
        </p>
      </div>
    </div>
  )
}
