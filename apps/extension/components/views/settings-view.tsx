import { useState } from "react"

import { Button } from "~components/ui/button"
import { SettingsForm } from "~components/settings-form"
import { useMemoryDelete } from "~hooks/use-memory-delete"
import { useMemoryList } from "~hooks/use-memory-list"

export const SettingsView = ({ containerTag }: { containerTag: string }) => {
  const { data: memories } = useMemoryList(containerTag, 9999)
  const { mutate: deleteDoc } = useMemoryDelete()
  const [wiping, setWiping] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const handleWipe = async () => {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setWiping(true)
    for (const doc of memories ?? []) await deleteDoc(doc.id)
    setWiping(false)
    setConfirm(false)
  }

  return (
    <div className="overflow-y-auto h-full p-3 space-y-5">
      <SettingsForm />

      <div className="pt-4 border-t border-line">
        <p className="text-[11px] font-semibold text-fg-2 mb-1">Danger zone</p>
        <p className="text-[11px] text-fg-3 mb-3 leading-relaxed">
          Permanently removes all saved memories. Cannot be undone.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant={confirm ? "default" : "outline"}
            size="sm"
            onClick={handleWipe}
            disabled={wiping}
          >
            {wiping ? "Wiping…" : confirm ? "Confirm wipe" : "Wipe all memory"}
          </Button>
          {confirm && (
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
