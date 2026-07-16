import { type InputHTMLAttributes, forwardRef } from "react"

import { cn } from "~lib/utils"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "w-full rounded-md bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-3",
        "outline-none ring-0 transition-all",
        "focus:ring-1 focus:ring-primary/30 focus:bg-bg",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"
