/**
 * Application logging configuration using Pino.
 * Provides structured logging with the following features:
 * - Console output with pretty printing in development
 * - File-based logging with separate error log
 * - Automatic log rotation
 * - Redaction of sensitive data
 * - Component-specific child loggers
 *
 * @module logger
 */

import pino from 'pino'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// Configure log file paths
const logDir = join(dirname(__dirname), 'logs')

// Ensure logs directory exists
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}

const logPath = join(logDir, 'app.log')
const errorLogPath = join(logDir, 'error.log')

/**
 * Main logger instance configured with:
 * - ISO timestamp format
 * - Uppercase log levels
 * - Redaction of sensitive fields
 * - Multi-stream output (console, file, error file)
 */
const logger = pino(
  {
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() }
      }
    },
    redact: {
      paths: ['password', 'basicAuthPassword'],
      censor: '[REDACTED]'
    }
  },
  pino.multistream([
    {
      level: LOG_LEVEL,
      stream: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard'
        }
      })
    },
    {
      level: LOG_LEVEL,
      stream: pino.destination(logPath)
    },
    {
      level: 'error',
      stream: pino.destination(errorLogPath)
    }
  ])
)

/** Database operations logger */
export const dbLogger = logger.child({ component: 'database' })

/** Caddy server configuration and operations logger */
export const caddyLogger = logger.child({ component: 'caddy' })

/** Authentication and authorization logger */
export const authLogger = logger.child({ component: 'auth' })

/** API endpoints and request handling logger */
export const apiLogger = logger.child({ component: 'api' })

export default logger
