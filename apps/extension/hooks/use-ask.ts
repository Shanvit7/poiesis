import { useCallback, useState } from "react"

import type { AiProvider } from "~lib/constants"
import { askService } from "~services/ask.service"

interface AskState {
  answer: string
  streaming: boolean
  error: string | null
}

export const useAsk = (containerTag: string) => {
  const [state, setState] = useState<AskState>({ answer: "", streaming: false, error: null })

  const ask = useCallback(
    async (question: string, provider: AiProvider, aiApiKey: string) => {
      setState({ answer: "", streaming: true, error: null })
      try {
        for await (const chunk of askService.stream(question, containerTag, provider, aiApiKey)) {
          setState((prev) => ({ ...prev, answer: prev.answer + chunk }))
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Ask failed",
        }))
      } finally {
        setState((prev) => ({ ...prev, streaming: false }))
      }
    },
    [containerTag]
  )

  const reset = useCallback(() => setState({ answer: "", streaming: false, error: null }), [])

  return { ...state, ask, reset }
}
