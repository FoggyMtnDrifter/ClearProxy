import pino from 'pino'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, existsSync } from 'fs'
const __dirname = dirname(fileURLToPath(import.meta.url))
const isDevelopment = process.env.NODE_ENV === 'development'
const LOG_LEVEL = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')
const logDir = join(dirname(__dirname), 'logs')
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}
const logPath = join(logDir, 'app.log')
const errorLogPath = join(logDir, 'error.log')
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
export const dbLogger = logger.child({ component: 'database' })
export const caddyLogger = logger.child({ component: 'caddy' })
export const authLogger = logger.child({ component: 'auth' })
export const apiLogger = logger.child({ component: 'api' })
export default logger
