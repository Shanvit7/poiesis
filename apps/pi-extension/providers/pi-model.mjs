/**
 * Custom promptfoo provider — routes to whatever model pi is currently configured with.
 *
 * Reads ~/.pi/agent/settings.json (defaultProvider + defaultModel) and
 * ~/.pi/agent/models.json (baseUrl, apiKey, api type) at eval time.
 * Supports both `anthropic-messages` and `openai-completions` API shapes,
 * so it works whether you're on antrhopic/Claude, opencode/DeepSeek, etc.
 */

import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const PI_DIR = join(homedir(), ".pi", "agent")

const readPiConfig = () => {
  // CI / env-var override — set these in GitHub Actions secrets instead of shipping ~/.pi
  if (process.env.PI_API_KEY) {
    const api = process.env.PI_API ?? "anthropic-messages"
    return {
      providerId: "env",
      model: process.env.PI_MODEL ?? "claude-haiku-4-5-20251001",
      providerConfig: {
        baseUrl: process.env.PI_BASE_URL ?? "https://api.anthropic.com",
        apiKey: process.env.PI_API_KEY,
        api,
      },
    }
  }
  // Local — read from pi's own config
  const settings = JSON.parse(readFileSync(join(PI_DIR, "settings.json"), "utf8"))
  const models = JSON.parse(readFileSync(join(PI_DIR, "models.json"), "utf8"))
  const providerId = settings.defaultProvider
  const model = settings.defaultModel
  const providerConfig = models.providers[providerId]
  if (!providerConfig) throw new Error(`pi provider "${providerId}" not found in models.json`)
  return { providerId, model, providerConfig }
}

// Convert Anthropic-style tool defs → OpenAI-style (for openai-completions providers)
const toOpenAiTools = (tools) =>
  tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.input_schema ?? { type: "object", properties: {} },
    },
  }))

export default class PiModelProvider {
  id() {
    try {
      const { providerId, model } = readPiConfig()
      return `pi:${providerId}/${model}`
    } catch {
      return "pi:unknown"
    }
  }

  async callApi(prompt, _context, options) {
    const { providerId, model, providerConfig } = readPiConfig()
    const { baseUrl, apiKey, api } = providerConfig
    const tools = options?.config?.tools ?? []

    if (api === "anthropic-messages") {
      return this._callAnthropic({ baseUrl, apiKey, model, prompt, tools })
    }
    // openai-completions (opencode, company-dev-server, etc.)
    return this._callOpenAi({ baseUrl, apiKey, model, prompt, tools })
  }

  async _callAnthropic({ baseUrl, apiKey, model, prompt, tools }) {
    const body = {
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      ...(tools.length && { tools }),
    }

    const resp = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    })

    const data = await resp.json()
    if (!resp.ok) return { error: `Anthropic API error ${resp.status}: ${JSON.stringify(data)}` }

    // Stringify full content so tool_use blocks are visible to JS assertions
    const output =
      data.content?.length === 1 && data.content[0].type === "text"
        ? data.content[0].text
        : JSON.stringify(data.content)

    return {
      output,
      tokenUsage: {
        prompt: data.usage?.input_tokens,
        completion: data.usage?.output_tokens,
        total: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
    }
  }

  async _callOpenAi({ baseUrl, apiKey, model, prompt, tools }) {
    const body = {
      model,
      messages: [{ role: "user", content: prompt }],
      ...(tools.length && { tools: toOpenAiTools(tools) }),
    }

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await resp.json()
    if (!resp.ok) return { error: `OpenAI API error ${resp.status}: ${JSON.stringify(data)}` }

    const msg = data.choices?.[0]?.message
    // Include tool_calls in output so JS assertions can find tool names
    const output = msg?.tool_calls?.length
      ? JSON.stringify({ content: msg.content, tool_calls: msg.tool_calls })
      : (msg?.content ?? "")

    return {
      output,
      tokenUsage: {
        prompt: data.usage?.prompt_tokens,
        completion: data.usage?.completion_tokens,
        total: data.usage?.total_tokens,
      },
    }
  }
}
