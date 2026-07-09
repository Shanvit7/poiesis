import { queryOptions } from "@tanstack/react-query"

import type { Memory } from "@/schemas/memory.schema"

export type MemoryListParams = Record<string, unknown>
type MemoryListResponse = { memories: Memory[]; total: number; cursor?: string | null }
import { ApiService } from "@/services/index"
import { TAGS } from "@/services/tags"

// ─── Client ───────────────────────────────────────────────────────────────────

const api = new ApiService()

// ─── Errors ───────────────────────────────────────────────────────────────────

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

  get isNotFound() {
    return this.status === 404
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class MemoryService {
  private readonly api: ApiService

  constructor() {
    this.api = api
  }

  /** GET /api/memories — paginated list, optionally filtered by channel / cursor. */
  async list(_params?: MemoryListParams): Promise<MemoryListResponse> {
    // TODO: implement
    throw new MemoryError("not implemented")
  }

  /** GET /api/memories/:videoId — fetch a single memory by YouTube video ID. */
  async getByVideoId(_videoId: string): Promise<Memory> {
    // TODO: implement
    throw new MemoryError("not implemented")
  }

  /** Pre-built query options for the memory list. */
  listQueryOptions(params?: MemoryListParams) {
    return queryOptions({
      queryKey: TAGS.memories.list(params),
      queryFn: () => this.list(params),
    })
  }

  /** Pre-built query options for a single memory. */
  detailQueryOptions(videoId: string) {
    return queryOptions({
      queryKey: TAGS.memories.detail(videoId),
      queryFn: () => this.getByVideoId(videoId),
      enabled: !!videoId,
    })
  }
}

export const memoryService = new MemoryService()
