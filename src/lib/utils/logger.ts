/**
 * Logger module for the application.
 * Configures and exports Pino logger instances for different components of the application.
 * @module logger
 */
import pino from 'pino'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, existsSync } from 'fs'
const __dirname = dirname(fileURLToPath(import.meta.url))
const isDevelopment = process.env.NODE_ENV === 'development'
const LOG_LEVEL = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')

const logDir = join(dirname(dirname(__dirname)), 'logs')
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}
const logPath = join(logDir, 'app.log')
const errorLogPath = join(logDir, 'error.log')

const prodTransports = pino.multistream([
  {
    level: LOG_LEVEL,
    stream: pino.destination({
      dest: logPath,
      sync: false
    })
  },
  {
    level: 'error',
    stream: pino.destination({
      dest: errorLogPath,
      sync: true
    })
  }
])

const devTransport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    ignore: 'pid,hostname',
    translateTime: 'SYS:standard',
    minimumLevel: LOG_LEVEL
  }
})

/**
 * Main logger instance configured with appropriate log level, formatters, and redaction.
 * Outputs to console (with pretty formatting in development) and log files.
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
    },
    enabled: process.env.LOG_LEVEL !== 'silent'
  },
  isDevelopment ? devTransport : prodTransports
)

const componentLoggers = new Map<string, pino.Logger>()

/**
 * Creates or retrieves a logger for a specific component
 *
 * @param {string} component - Component name
 * @returns {pino.Logger} Logger instance for the component
 */
function getComponentLogger(component: string): pino.Logger {
  if (!componentLoggers.has(component)) {
    componentLoggers.set(component, logger.child({ component }))
  }
  return componentLoggers.get(component)!
}

/**
 * Logger instance for database operations
 * @type {import('pino').Logger}
 */
export const dbLogger = getComponentLogger('database')

/**
 * Logger instance for Caddy server operations
 * @type {import('pino').Logger}
 */
export const caddyLogger = getComponentLogger('caddy')

/**
 * Logger instance for authentication operations
 * @type {import('pino').Logger}
 */
export const authLogger = getComponentLogger('auth')

/**
 * Logger instance for API operations
 * @type {import('pino').Logger}
 */
export const apiLogger = getComponentLogger('api')

export default logger
