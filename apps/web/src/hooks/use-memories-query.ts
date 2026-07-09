import { useQuery } from "@tanstack/react-query"

import { memoryService } from "@/services/memory.service"
import type { MemoryListParams } from "@/services/memory.service"

/**
 * Query hook for the paginated memory list.
 *
 * Usage:
 * ```tsx
 * const { data, isPending, isError } = useMemoriesQuery({ channel: '@mkbhd', limit: 20 });
 * ```
 */
export const useMemoriesQuery = (params?: MemoryListParams) =>
  useQuery(memoryService.listQueryOptions(params))
