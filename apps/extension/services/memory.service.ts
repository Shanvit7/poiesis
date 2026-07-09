import { createLogger } from "~lib/logger"
import type { CapturePayload } from "~lib/types"
import { HttpService, getStoredToken } from "~services/http"

// ── Logger ────────────────────────────────────────────────────────────────────

const logger = createLogger("memory-service")

// ── API base URL ──────────────────────────────────────────────────────────────

const API_BASE = process.env.PLASMO_PUBLIC_API_URL ?? "http://localhost:3001"

// ── Errors ────────────────────────────────────────────────────────────────────

export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = "MemoryError"
  }

  get isUnauthenticated() {
    return this.status === 401
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

const http = new HttpService(API_BASE)

export class MemoryService {
  private readonly http: HttpService

  constructor() {
    this.http = http
  }

  /**
   * POST /api/memories
   *
   * Checks for a stored API token first — if there is none, throws
   * immediately without hitting the network (no point making the round trip).
   * Callers should catch MemoryError and check `isUnauthenticated` to decide
   * whether to queue locally or surface an error to the user.
   */
  async capture(payload: CapturePayload): Promise<void> {
    const token = await getStoredToken()

    if (!token) {
      logger.warn({ videoId: payload.videoId }, "no token — skipping network call")
      throw new MemoryError("Not authenticated", 401)
    }

    logger.info({ videoId: payload.videoId }, "capturing memory")

    const result = await this.http.post<{ ok: boolean }>("/api/memories", payload)

    if (result.isError) {
      const status =
        result.error instanceof Error && "status" in result.error
          ? (result.error as MemoryError).status
          : undefined

      logger.error(
        { videoId: payload.videoId, status },
        result.error?.message ?? "failed to capture memory"
      )

      throw new MemoryError(result.error?.message ?? "Failed to capture memory", status)
    }

    logger.info({ videoId: payload.videoId }, "memory captured successfully")
  }
}

export const memoryService = new MemoryService()
