import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merge Tailwind class names — drop conflicting classes, keep last winner. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/** Pull a string value from an opaque metadata object (supermemory SDK returns `unknown`). */
export const getMeta = (metadata: unknown, key: string): string => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return ""
  return String((metadata as Record<string, unknown>)[key] ?? "")
}
