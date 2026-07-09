export const IS_DEV = process.env.NODE_ENV !== "production"
export const LOG_LEVEL = process.env.LOG_LEVEL ?? "info"

// Supermemory
export const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY ?? ""
export const SUPERMEMORY_BASE_URL = process.env.SUPERMEMORY_BASE_URL ?? "http://localhost:6767"
