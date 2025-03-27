/**
 * Caddy initialization module.
 * Handles startup configuration sync for Caddy server.
 * @module caddy/init
 */
import { proxyHostRepository } from '$lib/repositories/proxyHostRepository'
import { reloadCaddyConfig } from './config'
import { caddyLogger } from '$lib/utils/logger'

/**
 * Maximum number of retries for initial Caddy configuration
 */
const MAX_INIT_RETRIES = 5

/**
 * Initial delay between retries in milliseconds
 */
const INIT_RETRY_DELAY = 2000

/**
 * Initializes Caddy configuration on app startup
 * Retries multiple times to ensure Caddy is ready
 */
export async function initializeCaddyConfig(): Promise<void> {
  let retryCount = 0
  let lastError: Error | undefined

  while (retryCount < MAX_INIT_RETRIES) {
    try {
      caddyLogger.info(
        { attempt: retryCount + 1, maxRetries: MAX_INIT_RETRIES },
        'Attempting to initialize Caddy configuration'
      )

      const hosts = await proxyHostRepository.getAll()
      await reloadCaddyConfig(hosts)

      caddyLogger.info(
        { hostCount: hosts.length },
        'Successfully initialized Caddy configuration on startup'
      )
      return
    } catch (error) {
      lastError = error as Error
      retryCount++

      if (retryCount < MAX_INIT_RETRIES) {
        caddyLogger.warn(
          {
            error: lastError,
            attempt: retryCount,
            maxRetries: MAX_INIT_RETRIES,
            nextRetryIn: INIT_RETRY_DELAY
          },
          'Failed to initialize Caddy configuration, will retry'
        )
        await new Promise((resolve) => setTimeout(resolve, INIT_RETRY_DELAY))
      }
    }
  }

  caddyLogger.error(
    { error: lastError, attempts: retryCount },
    'Failed to initialize Caddy configuration after maximum retries'
  )
  throw lastError
}
