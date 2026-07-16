import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { AI_KEY_PLACEHOLDERS, AI_PROVIDER_LABELS, AI_PROVIDERS } from "~lib/constants"
import { SETTINGS_DEFAULTS, type Settings, saveSettings, validateSettings } from "~lib/settings"
import { probeSupermemory } from "~services/http"
import { cn } from "~lib/utils"

interface Props {
  onSaved?: () => void
}

const Field = ({
  label,
  hint,
  error,
  children,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string
  children: React.ReactNode
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-fg-2">{label}</label>
    {children}
    {error && <p className="text-[11px] text-primary">{error}</p>}
    {hint && <p className="text-[11px] text-fg-3 leading-relaxed">{hint}</p>}
  </div>
)

export const SettingsForm = ({ onSaved }: Props) => {
  const [form, setForm] = useState<Settings>(SETTINGS_DEFAULTS)
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({})
  const [saved, setSaved] = useState(false)
  const [probeStatus, setProbeStatus] = useState<"idle" | "ok" | "fail">("idle")
  const [probing, setProbing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(SETTINGS_DEFAULTS, (data) => {
      setForm(data as Settings)
    })
  }, [])

  const set = (field: keyof Settings, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSaved(false)
  }

  const handleSave = () => {
    const result = validateSettings(form)
    if (!result.success) {
      setErrors(result.errors)
      return
    }
    void saveSettings(result.data).then(() => {
      setSaved(true)
      onSaved?.()
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleProbe = async () => {
    setProbing(true)
    setProbeStatus("idle")
    const ok = await probeSupermemory()
    setProbeStatus(ok ? "ok" : "fail")
    setProbing(false)
  }

  return (
    <div className="space-y-4">
      {/* Supermemory API Key */}
      <Field
        label="Supermemory API Key"
        error={errors.apiKey}
        hint={
          <>
            Get your key at{" "}
            <a
              href="https://supermemory.ai"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-fg-2 transition-colors"
            >
              supermemory.ai
            </a>
          </>
        }
      >
        <Input
          id="apiKey"
          type="password"
          value={form.apiKey}
          onChange={(e) => set("apiKey", e.target.value)}
          placeholder="From supermemory.ai dashboard"
          className={cn("font-mono", errors.apiKey && "ring-1 ring-primary")}
        />
      </Field>

      {/* AI Provider */}
      <Field
        label={
          <>
            AI Provider <span className="font-normal text-fg-3">(Ask tab)</span>
          </>
        }
      >
        <select
          id="aiProvider"
          className="w-full rounded-md bg-surface px-3 py-2 text-sm text-fg outline-none focus:ring-1 focus:ring-primary/30 focus:bg-bg transition-all"
          value={form.aiProvider}
          onChange={(e) => set("aiProvider", e.target.value)}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {AI_PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </Field>

      {/* AI API Key */}
      <Field
        label={
          <>
            {AI_PROVIDER_LABELS[form.aiProvider]} Key{" "}
            <span className="font-normal text-fg-3">— Ask tab only</span>
          </>
        }
      >
        <Input
          id="aiApiKey"
          type="password"
          value={form.aiApiKey}
          onChange={(e) => set("aiApiKey", e.target.value)}
          placeholder={AI_KEY_PLACEHOLDERS[form.aiProvider]}
          className="font-mono"
        />
      </Field>

      {/* Container Tag */}
      <Field label="Container Tag" hint="Groups your memories. Default: user_default">
        <Input
          id="containerTag"
          type="text"
          value={form.containerTag}
          onChange={(e) => set("containerTag", e.target.value)}
          className="font-mono"
        />
      </Field>

      {/* Gate Threshold */}
      <Field
        label={
          <>
            Memory Gate threshold:{" "}
            <span className="font-mono">{form.gateThreshold.toFixed(2)}</span>
          </>
        }
      >
        <input
          id="gateThreshold"
          type="range"
          min={0}
          max={1}
          step={0.05}
          className="w-full accent-primary"
          value={form.gateThreshold}
          onChange={(e) => set("gateThreshold", Number.parseFloat(e.target.value))}
        />
        <div className="flex justify-between text-[11px] text-fg-3 -mt-0.5">
          <span>Save more</span>
          <span>Save less</span>
        </div>
      </Field>

      {/* Advanced */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-xs text-fg-3 hover:text-fg transition-colors"
        >
          {showAdvanced ? (
            <ChevronDown size={12} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={12} strokeWidth={1.5} />
          )}
          Advanced
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <Field label="Supermemory Base URL">
              <Input
                id="baseURL"
                type="text"
                value={form.baseURL}
                onChange={(e) => set("baseURL", e.target.value)}
                className="font-mono"
              />
            </Field>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleProbe} disabled={probing}>
                {probing ? "Testing…" : "Test connection"}
              </Button>
              {probeStatus === "ok" && (
                <span className="text-[11px] text-green-600">Connected</span>
              )}
              {probeStatus === "fail" && (
                <span className="text-[11px] text-primary">Not reachable</span>
              )}
            </div>
          </div>
        )}
      </div>

      <Button className="w-full" onClick={handleSave}>
        {saved ? "Saved" : "Save settings"}
      </Button>
    </div>
  )
}
