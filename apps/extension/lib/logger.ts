// Structured logger for the extension backed by loglevel.
// Mirrors the createLogger(name) API used across the codebase.
//
// Log levels (lowest → highest): debug | info | warn | error | silent
//   dev build  → debug  (all levels visible in DevTools)
//   prod build → warn   (only warn + error ship)
//
// Override per-module at runtime in DevTools:
//   import log from 'loglevel'; log.getLogger('background').setLevel('debug')
//
// Plasmo replaces process.env.NODE_ENV at bundle time (no runtime leak).

import log from "loglevel"

log.setDefaultLevel(process.env.NODE_ENV === "production" ? "warn" : "debug")

type LogData = Record<string, unknown>

interface Logger {
  debug: (data: LogData, msg: string) => void
  info: (data: LogData, msg: string) => void
  warn: (data: LogData, msg: string) => void
  error: (data: LogData, msg: string) => void
}

export const createLogger = (name: string): Logger => {
  const logger = log.getLogger(name)
  const tag = `[supatube:${name}]`

  return {
    debug: (data, msg) => logger.debug(tag, msg, data),
    info: (data, msg) => logger.info(tag, msg, data),
    warn: (data, msg) => logger.warn(tag, msg, data),
    error: (data, msg) => logger.error(tag, msg, data),
  }
}
