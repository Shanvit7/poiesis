import { useState } from "react"

import { EmptyState } from "~components/ui/empty-state"
import { SearchInput } from "~components/ui/search-input"
import { useMemorySearch } from "~hooks/use-memory-search"
import { getMeta } from "~lib/utils"

// ponytail: timer kept on the fn object to avoid a ref for a single debounce
let _debounce: ReturnType<typeof setTimeout>

export const RecallView = ({ containerTag }: { containerTag: string }) => {
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const { data, isLoading } = useMemorySearch(debouncedQ, containerTag)

  const handleChange = (value: string) => {
    setQ(value)
    clearTimeout(_debounce)
    _debounce = setTimeout(() => setDebouncedQ(value), 300)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <SearchInput
          value={q}
          onChange={handleChange}
          placeholder="Search your memories…"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="px-3 py-6 text-xs text-fg-3 text-center">Searching…</p>}

        {!isLoading && !debouncedQ && (
          <EmptyState
            title=""
            description="Type to search across everything Poiesis has saved for you."
          />
        )}

        {!isLoading && debouncedQ && data?.length === 0 && (
          <EmptyState title="No results" description={`Nothing saved matching "${debouncedQ}"`} />
        )}

        {data && data.length > 0 && (
          <ul className="divide-y divide-line">
            {data.map((result) => {
              const videoId = getMeta(result.metadata, "videoId")
              const url =
                getMeta(result.metadata, "url") ||
                (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "")
              const channel = getMeta(result.metadata, "channel")
              const title = result.title ?? getMeta(result.metadata, "title")

              return (
                <li key={result.documentId}>
                  <button
                    type="button"
                    onClick={() => url && chrome.tabs.create({ url })}
                    className="w-full text-left px-3 py-3 hover:bg-surface transition-colors"
                  >
                    <p className="text-sm text-fg leading-tight line-clamp-1">{title}</p>
                    {channel && <p className="text-xs text-fg-3 mt-0.5 truncate">{channel}</p>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
