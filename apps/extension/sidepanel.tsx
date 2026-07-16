import "~globals.css"

import { useState } from "react"

import { NavStrip, type View } from "~components/nav-strip"
import { AskView } from "~components/views/ask-view"
import { ForYouView } from "~components/views/for-you-view"
import { RecallView } from "~components/views/recall-view"
import { SettingsView } from "~components/views/settings-view"
import { TimelineView } from "~components/views/timeline-view"
import { useSettings } from "~hooks/use-settings"

export default function SidePanel() {
  const [view, setView] = useState<View>("recall")
  const { containerTag, aiProvider, aiApiKey, apiKey } = useSettings()

  return (
    <div className="flex flex-col h-screen bg-bg text-fg">
      <NavStrip active={view} onNav={setView} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "recall" && <RecallView containerTag={containerTag} />}
        {view === "foryou" && <ForYouView containerTag={containerTag} />}
        {view === "timeline" && <TimelineView containerTag={containerTag} />}
        {view === "ask" && (
          <AskView
            containerTag={containerTag}
            aiProvider={aiProvider}
            aiApiKey={aiApiKey}
            apiKey={apiKey}
          />
        )}
        {view === "settings" && <SettingsView containerTag={containerTag} />}
      </div>
    </div>
  )
}
