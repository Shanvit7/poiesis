// Base HTTP client for the extension. Mirrors ApiService from the web app but
// adapted for the Chrome extension context:
//   - Pulls the auth token from chrome.storage before every request
//   - Returns FetchState<T> — callers check isError instead of catching

import { createLogger } from "~lib/logger"

const logger = createLogger("http")

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FetchState<T> {
  data: T | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "HttpError"
  }
}

// ── Token helper ──────────────────────────────────────────────────────────────

export const getStoredToken = (): Promise<string | null> =>
  new Promise((resolve) =>
    chrome.storage.local.get({ apiToken: null }, ({ apiToken }) =>
      resolve(apiToken as string | null)
    )
  )

// ── HttpService ───────────────────────────────────────────────────────────────

export class HttpService {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async fetchData<T>(endpoint: string, options: RequestInit = {}): Promise<FetchState<T>> {
    const state: FetchState<T> = {
      data: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
      error: null,
    }

    const token = await getStoredToken()
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new HttpError(response.status, `HTTP error! status: ${response.status}`)
      }

      logger.info({ endpoint }, "request successful")
      const data = (await response.json()) as T
      return { ...state, data, isLoading: false, isSuccess: true }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error

      // 4xx errors are expected — don't pollute the log
      const is4xx = error instanceof HttpError && error.status >= 400 && error.status < 500
      if (!is4xx) {
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error({ endpoint, err: error }, `request failed: ${message}`)
      }

      return {
        ...state,
        isLoading: false,
        isError: true,
        error: error instanceof Error ? error : new Error("Unknown error"),
      }
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}) {
    logger.info({ endpoint }, "GET")
    return this.fetchData<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, body: unknown, options: RequestInit = {}) {
    logger.info({ endpoint }, "POST")
    return this.fetchData<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...options.headers },
    })
  }
}
