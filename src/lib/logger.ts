/**
 * Simple logging utility for the application
 * Provides structured logging with levels: info, warn, error, debug
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to info level, can be overridden with LOG_LEVEL env var
const currentLevel = LOG_LEVELS[
  (process.env.LOG_LEVEL || "info") as LogLevel
] || LOG_LEVELS.info;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevel;
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message), data || "");
    }
  },

  info: (message: string, data?: unknown) => {
    if (shouldLog("info")) {
      console.log(formatMessage("info", message), data || "");
    }
  },

  warn: (message: string, data?: unknown) => {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message), data || "");
    }
  },

  error: (message: string, error?: unknown) => {
    if (shouldLog("error")) {
      if (error instanceof Error) {
        console.error(formatMessage("error", message), {
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error(formatMessage("error", message), error || "");
      }
    }
  },
};
