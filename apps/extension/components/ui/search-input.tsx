import { Search } from "lucide-react"

import { cn } from "~lib/utils"
import { Input } from "~components/ui/input"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search…",
  autoFocus = false,
  className,
}: SearchInputProps) => (
  <div className={cn("relative", className)}>
    <Search
      size={14}
      strokeWidth={1.5}
      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none"
    />
    <Input
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="pl-8"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
)
