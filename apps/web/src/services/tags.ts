/**
 * Central registry of all TanStack Query cache keys.
 *
 * Rules:
 *  - Every domain owns a top-level key (first array element).
 *  - Sub-keys narrow the scope for granular invalidation.
 *  - Always use `as const` so keys are inferred as literal tuples,
 *    not widened to `string[]`.
 *
 * Usage:
 *   useQuery({ queryKey: TAGS.memories.all })
 *   queryClient.invalidateQueries({ queryKey: TAGS.memories.all })
 */
export const TAGS = {
  memories: {
    /** Matches every memory-related query. */
    all: ["memories"] as const,
    /** State for a specific memory by video ID. */
    detail: (videoId: string) => [...TAGS.memories.all, videoId] as const,
    /** Paginated list with optional filters. */
    list: (filters?: Record<string, unknown>) => [...TAGS.memories.all, "list", filters] as const,
  },
} as const
