import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "~components/ui/button"
import { EmptyState } from "~components/ui/empty-state"
import { SearchInput } from "~components/ui/search-input"
import { useMemoryDelete } from "~hooks/use-memory-delete"
import { useMemoryList } from "~hooks/use-memory-list"
import { getMeta } from "~lib/utils"

export const TimelineView = ({ containerTag }: { containerTag: string }) => {
  const { data, isLoading, setData } = useMemoryList(containerTag, 100)
  const { mutate: deleteDoc } = useMemoryDelete()
  const [filter, setFilter] = useState("")

  const handleDelete = (id: string) => {
    setData((prev) => prev.filter((d) => d.id !== id))
    void deleteDoc(id)
  }

  const memories = data ?? []
  const filtered = filter
    ? memories.filter((m) => {
        const text =
          `${getMeta(m.metadata, "title")} ${getMeta(m.metadata, "channel")}`.toLowerCase()
        return text.includes(filter.toLowerCase())
      })
    : memories

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <SearchInput
          value={filter}
          onChange={setFilter}
          placeholder="Filter by title or channel…"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="px-3 py-6 text-xs text-fg-3 text-center">Loading…</p>}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            title={filter ? "No matches" : "Nothing saved yet"}
            description={
              filter
                ? `Nothing matching "${filter}"`
                : "Watch YouTube and let Poiesis save the worthwhile ones."
            }
          />
        )}

        <ul className="divide-y divide-line">
          {filtered.map((doc) => {
            const title = getMeta(doc.metadata, "title")
            const channel = getMeta(doc.metadata, "channel")
            const pct = getMeta(doc.metadata, "watchPercent")
            const src = getMeta(doc.metadata, "gateSource")
            const date = doc.createdAt
              ? new Date(doc.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })
              : ""

            return (
              <li
                key={doc.id}
                className="flex items-start gap-2 px-3 py-2.5 group hover:bg-surface transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg leading-tight line-clamp-1">{title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {channel && <span className="text-[11px] text-fg-2">{channel}</span>}
                    {pct && (
                      <>
                        <span className="text-[10px] text-line-2">·</span>
                        <span className="text-[11px] text-fg-3">{pct}%</span>
                      </>
                    )}
                    {src === "memory-gate" && (
                      <>
                        <span className="text-[10px] text-line-2">·</span>
                        <span className="text-[10px] text-primary font-medium">AI</span>
                      </>
                    )}
                    {date && (
                      <>
                        <span className="text-[10px] text-line-2">·</span>
                        <span className="text-[11px] text-fg-3">{date}</span>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Remove"
                  onClick={() => handleDelete(doc.id)}
                  className="mt-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <X size={12} strokeWidth={1.5} />
                </Button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
