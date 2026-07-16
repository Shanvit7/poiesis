// ── Ask Service ───────────────────────────────────────────────────────────────
// Runs in the side panel renderer. All ai-sdk imports are DYNAMIC to avoid
// module-init crashes in Chrome extension contexts.

import { AI_MODELS, type AiProvider } from "~lib/constants"
import { memoryService } from "~services/memory.service"

const buildModel = async (provider: AiProvider, apiKey: string) => {
  switch (provider) {
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai")
      return createOpenAI({ apiKey })(AI_MODELS.openai)
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic")
      return createAnthropic({ apiKey })(AI_MODELS.anthropic)
    }
    case "google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google")
      return createGoogleGenerativeAI({ apiKey })(AI_MODELS.google)
    }
  }
}

export class AskService {
  async *stream(
    question: string,
    containerTag: string,
    provider: AiProvider,
    aiApiKey: string
  ): AsyncGenerator<string> {
    const [profile, searchResults] = await Promise.all([
      memoryService.profile(containerTag).catch(() => null),
      memoryService.search(question, containerTag, 5).catch(() => []),
    ])

    const profileText = [...(profile?.static ?? []), ...(profile?.dynamic ?? [])].join("\n")

    const contextText = searchResults
      .map((r) => r.content ?? "")
      .filter(Boolean)
      .join("\n\n")

    const system = [
      "You are a personal learning assistant with access to the user's YouTube watch history.",
      profileText && `User learning profile:\n${profileText}`,
      contextText && `Relevant memories:\n${contextText}`,
    ]
      .filter(Boolean)
      .join("\n\n")

    const { streamText } = await import("ai")
    const result = await streamText({
      model: await buildModel(provider, aiApiKey),
      system,
      messages: [{ role: "user", content: question }],
    })

    for await (const chunk of result.textStream) {
      yield chunk
    }
  }
}

export const askService = new AskService()
