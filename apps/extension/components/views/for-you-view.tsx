import { RefreshCw } from "lucide-react"

import { EmptyState } from "~components/ui/empty-state"
import { Button } from "~components/ui/button"
import { useMemoryProfile } from "~hooks/use-memory-profile"
import { useMemorySearch } from "~hooks/use-memory-search"
import { getMeta } from "~lib/utils"

// ── Cluster row ───────────────────────────────────────────────────────────────

const ClusterRow = ({
  cluster,
  containerTag,
}: {
  cluster: string
  containerTag: string
}) => {
  const { data } = useMemorySearch(cluster, containerTag)
  if (!data || data.length === 0) return null

  return (
    <div className="mb-5">
      <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-fg-3">
        {cluster}
      </p>

      <div className="flex gap-2 overflow-x-auto px-3 pb-1 no-scrollbar">
        {data.slice(0, 6).map((r) => {
          const videoId = getMeta(r.metadata, "videoId")
          const thumb =
            getMeta(r.metadata, "thumbnailUrl") ||
            (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "")
          const url = getMeta(r.metadata, "url")
          const title = r.title ?? getMeta(r.metadata, "title")
          const channel = getMeta(r.metadata, "channel")

          return (
            <button
              key={r.documentId}
              type="button"
              onClick={() => url && chrome.tabs.create({ url })}
              className="flex-shrink-0 w-[9.5rem] text-left rounded-md overflow-hidden border border-line hover:border-line-2 transition-colors"
            >
              {thumb && (
                <img src={thumb} alt="" className="w-full h-[3.375rem] object-cover bg-surface" />
              )}
              <div className="p-1.5">
                <p className="text-[11px] font-medium text-fg line-clamp-2 leading-tight">
                  {title}
                </p>
                {channel && <p className="text-[10px] text-fg-3 mt-0.5 truncate">{channel}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── View ──────────────────────────────────────────────────────────────────────

export const ForYouView = ({ containerTag }: { containerTag: string }) => {
  const { data, isLoading, refetch } = useMemoryProfile(containerTag)
  const clusters = data?.dynamic?.slice(0, 5) ?? []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line">
        <span className="text-xs font-medium text-fg">Your interests</span>
        <Button variant="ghost" size="icon-sm" title="Refresh" onClick={() => refetch()}>
          <RefreshCw size={13} strokeWidth={1.5} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pt-3">
        {isLoading && <p className="px-3 py-4 text-xs text-fg-3">Building your taste profile…</p>}

        {!isLoading && clusters.length === 0 && (
          <EmptyState
            title="Nothing here yet"
            description="Save 5 or more videos and Poiesis will surface patterns in what you watch."
          />
        )}

        {clusters.map((cluster) => (
          <ClusterRow key={cluster} cluster={cluster} containerTag={containerTag} />
        ))}
      </div>
    </div>
  )
}
