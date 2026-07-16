import { Clock, MessageSquare, Search, Settings2, Star } from "lucide-react"

export type View = "recall" | "foryou" | "timeline" | "ask" | "settings"

const ICON_SIZE = 16
const ICON_STROKE = 1.5

const NAV: { id: View; Icon: React.FC; label: string }[] = [
  {
    id: "recall",
    Icon: () => <Search size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
    label: "Recall",
  },
  {
    id: "foryou",
    Icon: () => <Star size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
    label: "For You",
  },
  {
    id: "timeline",
    Icon: () => <Clock size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
    label: "History",
  },
  {
    id: "ask",
    Icon: () => <MessageSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
    label: "Ask",
  },
  {
    id: "settings",
    Icon: () => <Settings2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
    label: "Settings",
  },
]

interface NavStripProps {
  active: View
  onNav: (view: View) => void
}

export const NavStrip = ({ active, onNav }: NavStripProps) => (
  <nav className="flex border-b border-line bg-surface flex-shrink-0">
    {NAV.map(({ id, Icon, label }) => (
      <button
        key={id}
        type="button"
        title={label}
        onClick={() => onNav(id)}
        className={`flex-1 flex items-center justify-center py-3 relative transition-colors ${
          active === id ? "text-primary" : "text-fg-3 hover:text-fg-2"
        }`}
      >
        <Icon />
        {active === id && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-primary" />
        )}
      </button>
    ))}
  </nav>
)
