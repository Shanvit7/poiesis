import pino from "pino"

import { IS_DEV, LOG_LEVEL } from "@/constants"

export type Logger = pino.Logger

const isBrowser = typeof window !== "undefined"

/**
 * Creates a named pino logger.
 *
 * - Server (API routes, Server Components): uses pino-pretty in dev for
 *   human-readable output; bare pino in production for structured JSON.
 * - Browser (Client Components, service calls): falls back to pino's built-in
 *   browser mode which routes to console.* — no worker_threads required.
 */
export const createLogger = (name: string, options?: pino.LoggerOptions): Logger =>
  pino({
    name,
    level: LOG_LEVEL,
    ...options,
    ...(isBrowser
      ? {
          browser: { asObject: true },
        }
      : IS_DEV && {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss",
              ignore: "pid,hostname",
            },
          },
        }),
  })

export const logger = createLogger("supatube")
