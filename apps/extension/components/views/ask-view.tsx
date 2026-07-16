import { useState } from "react"
import { ArrowUp } from "lucide-react"

import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { useAsk } from "~hooks/use-ask"
import type { AiProvider } from "~lib/constants"

interface AskViewProps {
  containerTag: string
  aiProvider: AiProvider
  aiApiKey: string
  apiKey: string
}

const STARTERS = [
  "What React tutorials have I saved?",
  "Summarize my TypeScript videos",
  "What topics do I watch most?",
]

export const AskView = ({ containerTag, aiProvider, aiApiKey, apiKey }: AskViewProps) => {
  const [question, setQuestion] = useState("")
  const { answer, streaming, error, ask, reset } = useAsk(containerTag)

  const ready = apiKey.trim().length > 0 && aiApiKey.trim().length > 0

  const handleAsk = () => {
    if (!question.trim() || streaming || !ready) return
    void ask(question.trim(), aiProvider, aiApiKey)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Response area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!apiKey.trim() && (
          <p className="text-xs text-fg-3 leading-relaxed">
            Add your <span className="text-fg-2 font-medium">Supermemory API key</span> in Settings
            to use Ask.
          </p>
        )}

        {apiKey.trim() && !aiApiKey.trim() && (
          <p className="text-xs text-fg-3 leading-relaxed">
            Add an <span className="text-fg-2 font-medium">AI provider key</span> in Settings to
            enable answers.
          </p>
        )}

        {ready && !answer && !streaming && !error && (
          <>
            <p className="text-xs text-fg-3">Ask anything about your saved videos.</p>
            <div className="space-y-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuestion(s)
                    reset()
                  }}
                  className="w-full text-left px-3 py-2 rounded-md bg-surface hover:bg-line text-xs text-fg-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {streaming && !answer && <p className="text-xs text-fg-3">Thinking…</p>}

        {answer && <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">{answer}</p>}

        {error && <p className="text-xs text-fg-3 leading-relaxed">{error}</p>}
      </div>

      {/* Input bar */}
      <div className="border-t border-line p-2.5 flex gap-2">
        <Input
          placeholder={ready ? "Ask about your history…" : "Configure keys in Settings first"}
          disabled={!ready || streaming}
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value)
            if (answer) reset()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAsk()
          }}
        />
        <Button
          size="icon"
          onClick={handleAsk}
          disabled={!ready || streaming || !question.trim()}
          title="Ask"
          className="flex-shrink-0"
        >
          <ArrowUp size={14} strokeWidth={2} />
        </Button>
      </div>
    </div>
  )
}
