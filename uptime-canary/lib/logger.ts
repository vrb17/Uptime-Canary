type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: Record<string, any>
}

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta && { meta })
  }
  
  console.log(JSON.stringify(entry))
}

export const logger = {
  info: (message: string, meta?: Record<string, any>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, any>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, any>) => log("error", message, meta)
}
