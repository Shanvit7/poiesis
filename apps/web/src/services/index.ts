import { createLogger } from "@/lib/logger"

const logger = createLogger("api-service")

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "HttpError"
  }
}

interface FetchState<T> {
  data: T | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
}

export class ApiService {
  private baseUrl = ""

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.setBaseUrl(baseUrl)
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
  }

  async fetchData<T>(endpoint: string, options?: RequestInit): Promise<FetchState<T>> {
    const state: FetchState<T> = {
      data: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
      error: null,
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: { ...options?.headers },
      })

      if (!response.ok) {
        throw new HttpError(response.status, `HTTP error! status: ${response.status}`)
      }

      logger.info({ endpoint }, "API call successful")

      const data = (await response.json()) as T

      return { ...state, data, isLoading: false, isSuccess: true }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error
      }

      // 4xx = expected/handled by the caller — don't pollute the error log
      const is4xx = error instanceof HttpError && error.status >= 400 && error.status < 500
      if (!is4xx) {
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error({ endpoint, err: error }, `API call failed: ${message}`)
      }

      return {
        ...state,
        isLoading: false,
        isError: true,
        error: error instanceof Error ? error : new Error("An error occurred"),
      }
    }
  }

  async get<T>(endpoint: string, options?: RequestInit) {
    logger.info({ endpoint }, "GET request")
    return this.fetchData<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    const isFormBody = body instanceof FormData || body instanceof URLSearchParams
    const headers = isFormBody
      ? { ...options?.headers }
      : { "Content-Type": "application/json", ...options?.headers }

    logger.info({ endpoint }, "POST request")
    return this.fetchData<T>(endpoint, {
      ...options,
      method: "POST",
      body: isFormBody ? (body as FormData | URLSearchParams) : JSON.stringify(body),
      headers,
    })
  }

  async put<T>(endpoint: string, body: unknown, options?: RequestInit) {
    logger.info({ endpoint }, "PUT request")
    return this.fetchData<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit) {
    logger.info({ endpoint }, "DELETE request")
    return this.fetchData<T>(endpoint, { ...options, method: "DELETE" })
  }
}

export default new ApiService()
