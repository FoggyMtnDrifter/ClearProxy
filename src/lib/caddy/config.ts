/**
 * Caddy server configuration module.
 * Handles generation, application, and management of Caddy reverse proxy configurations.
 * @module caddy/config
 */
import { proxyHosts } from '../db/schema'
import type { InferModel } from 'drizzle-orm'
import { caddyLogger } from '../utils/logger'
import { generateCaddyHash as _generateCaddyHash } from '../auth/password'
import { fixNullObjectPasswords } from '../db'

const CADDY_API_URL = process.env.CADDY_API_URL || 'http://localhost:2019'

const CADDY_ENDPOINTS = {
  LOAD: '/load',
  CONFIG: '/config/',
  ID: '/id/',
  STOP: '/stop'
}

const MAX_RETRIES = 3

const INITIAL_RETRY_DELAY = 1000

const MAX_RETRY_DELAY = 5000

type ProxyHost = InferModel<typeof proxyHosts>

/**
 * Encodes a string to Base64
 *
 * @param {string} str - The string to encode
 * @returns {string} Base64 encoded string
 */
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64')
}

/**
 * Creates a bcrypt-like hash string format for Caddy
 * Note: This doesn't actually hash the password, just formats it as expected by Caddy
 *
 * @param {string} password - The password to format
 * @returns {string} Formatted string in Caddy-compatible format
 * @private
 */
function _bcryptHash(password: string): string {
  return `$2a$14$${base64Encode(password)}`
}

/**
 * Interface representing a Caddy match condition
 * Used to define when a route should be applied based on host, protocol, or path
 */
interface CaddyMatch {
  host: string[]
  protocol?: string
  path?: string[]
}

interface CaddyHandler {
  handler:
    | 'reverse_proxy'
    | 'authentication'
    | 'static_response'
    | 'file_server'
    | 'php_fastcgi'
    | 'rewrite'
    | 'uri'
    | 'handle'
    | 'handle_path'
    | 'handle_errors'
    | 'headers'
    | 'encode'
    | 'templates'
    | 'respond'
  upstreams?: { dial: string }[]
  transport?: {
    protocol: string
    tls?: {
      insecure_skip_verify?: boolean
      server_name?: string
      trusted_ca_certs?: string[]
      client_certificate?: {
        cert: string
        key: string
      }
    }
    dial_timeout?: string
    dial_fallback_delay?: string
    response_header_timeout?: string
    read_buffer?: string
    write_buffer?: string
    max_response_header?: string
    compression?: boolean
  }
  load_balancing?: {
    selection_policy?: { name: string; options?: Record<string, unknown> }
    try_duration?: string
    try_interval?: string
    retries?: number
  }
  health_checks?: {
    active?: {
      uri?: string
      port?: number
      interval?: string
      timeout?: string
      max_size?: string
      expect_status?: number
      expect_body?: string
      headers?: Record<string, string[]>
    }
    passive?: {
      fail_duration?: string
      max_fails?: number
      unhealthy_status?: number[]
      unhealthy_latency?: string
    }
  }
  buffer?: {
    request?: { max_size?: string }
    response?: { max_size?: string }
  }
  status_code?: number
  headers?: Record<string, string[]>
  body?: string
  close?: boolean
  root?: string
  hide?: string[]
  index_names?: string[]
  browse?: {
    template_file?: string
  }
  providers?: {
    http_basic?: {
      accounts: { username: string; password: string }[]
      realm?: string
      hash?: boolean | { algorithm: string }
    }
  }
  error_pages?: Record<string, string>
  response?: {
    set?: Record<string, string[]>
    add?: Record<string, string[]>
    delete?: string[]
    replace?: Record<string, { search: string; replace: string }>
  }
  request?: {
    set?: Record<string, string[]>
    add?: Record<string, string[]>
    delete?: string[]
    replace?: Record<string, { search: string; replace: string }>
  }
  encodings?: {
    gzip?: boolean
    zstd?: boolean
  }
  uri_substring?: string
  strip_path_prefix?: string
  strip_path_suffix?: string
  uri_replace?: {
    search: string
    replace: string
  }[]
  mime_types?: string[]
  match?: Record<string, unknown>[]
  terminal?: boolean
}

/**
 * Interface representing a Caddy route configuration
 * Routes define how requests are matched and handled
 */
interface CaddyRoute {
  match: CaddyMatch[]
  handle: CaddyHandler[]
  terminal?: boolean
}

/**
 * Interface representing configuration for a Caddy server instance
 */
interface CaddyServerConfig {
  listen: string[]
  routes: CaddyRoute[]
  automatic_https: {
    disable: boolean
  }
  tls_connection_policies?: Record<string, unknown>[]
}

/**
 * Interface representing Caddy TLS configuration for certificate management
 */
interface CaddyTLSConfig {
  certificates?: {
    automate: string[]
  }
  automation?: {
    policies: {
      subjects: string[]
      issuers: {
        module: string
        challenges: {
          http: {
            alternate_port: number
          }
        }
      }[]
    }[]
  }
}

/**
 * Interface representing the full Caddy server configuration
 */
interface CaddyConfig {
  admin: {
    listen: string
    disabled: boolean
    enforce_origin?: boolean
    origins?: string[]
  }
  logging?: {
    logs: {
      default: {
        level: string
      }
    }
  }
  apps: {
    http: {
      servers: {
        [key: string]: CaddyServerConfig
      }
    }
    tls?: CaddyTLSConfig
  }
}

/**
 * Interface representing information about a TLS certificate
 */
interface CertificateInfo {
  managed: boolean
  issuer: string
  notBefore: string
  notAfter: string
  error?: string
}

/**
 * Custom error class for Caddy-related errors
 * Includes error code and details specific to Caddy
 */
class CaddyError extends Error {
  /**
   * Creates a new CaddyError
   *
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {unknown} details - Additional error details
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'CaddyError'
  }
}

/**
 * Pauses execution for the specified number of milliseconds
 *
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an async operation with exponential backoff
 * Useful for network operations that may fail transiently
 *
 * @template T - Return type of the operation
 * @param {() => Promise<T>} operation - The operation to retry
 * @param {number} retries - Maximum number of retry attempts
 * @param {number} delay - Initial delay between retries in milliseconds
 * @returns {Promise<T>} Result of the operation if successful
 * @throws The last error encountered if all retries fail
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i <= retries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (i === retries) break

      caddyLogger.warn(
        { error, attempt: i + 1, maxRetries: retries },
        'Operation failed, retrying...'
      )

      await sleep(delay)
      delay = Math.min(delay * 2, MAX_RETRY_DELAY)
    }
  }

  throw lastError
}

/**
 * Parses advanced Caddy configuration from a string
 * Allows for custom routing rules beyond the standard proxy configuration
 * Can handle both JSON format and Caddyfile directive format
 *
 * @param {string} config - String containing advanced Caddy configuration (JSON or Caddyfile directives)
 * @returns {CaddyRoute[]} Array of parsed Caddy routes
 */
function parseAdvancedConfig(config: string): CaddyRoute[] {
  if (!config) return []

  // First try to parse as JSON
  try {
    const parsedConfig = JSON.parse(config)

    if (Array.isArray(parsedConfig)) {
      return parsedConfig
    } else if (
      typeof parsedConfig === 'object' &&
      parsedConfig !== null &&
      'routes' in parsedConfig &&
      Array.isArray(parsedConfig.routes)
    ) {
      return parsedConfig.routes
    } else if (typeof parsedConfig === 'object' && parsedConfig !== null) {
      // Single route object, wrap in array
      return [parsedConfig as CaddyRoute]
    } else {
      caddyLogger.warn('Invalid advanced config format, expected array or object with routes array')
      return []
    }
  } catch (error) {
    // Not valid JSON, try to parse as Caddyfile directive format
    caddyLogger.debug(
      { error },
      'JSON parsing failed, attempting to process as Caddyfile directive'
    )

    try {
      // Handle Caddyfile directives like: route /.well-known/path { ... }
      if (config.trim().startsWith('route ')) {
        const routeMatch = config.match(/route\s+([^\s{]+)\s*{([^}]+)}/)
        if (routeMatch) {
          const path = routeMatch[1]
          const directives = routeMatch[2].trim()

          // Parse the directives
          const handlers: CaddyHandler[] = []

          // Check for respond directive
          const respondMatch = directives.match(/respond\s+`([^`]+)`/)
          if (respondMatch) {
            handlers.push({
              handler: 'static_response',
              body: respondMatch[1].trim()
            })
          }

          // Check for header directive
          const headerMatch = directives.match(/header\s+([^\s]+)\s+([^\s]+)/)
          if (headerMatch) {
            handlers.push({
              handler: 'headers',
              response: {
                set: {
                  [headerMatch[1]]: [headerMatch[2]]
                }
              }
            })
          }

          if (handlers.length > 0) {
            return [
              {
                match: [
                  {
                    path: [path],
                    host: [''] // This will be replaced in generateCaddyConfig with the actual host
                  }
                ],
                handle: handlers
              }
            ]
          }
        }
      }

      caddyLogger.warn('Could not parse as Caddyfile directive either, using empty configuration')
      return []
    } catch (directiveError) {
      caddyLogger.error({ error: directiveError }, 'Failed to parse Caddyfile directive')
      return []
    }
  }
}

function hasValidBasicAuth(host: ProxyHost): boolean {
  if (!host.basicAuthEnabled || !host.basicAuthUsername) {
    return false
  }

  const hasValidPasswordHash =
    (host.basicAuthPassword &&
      typeof host.basicAuthPassword === 'string' &&
      host.basicAuthPassword.startsWith('$2')) ||
    (host.basicAuthHash &&
      typeof host.basicAuthHash === 'string' &&
      host.basicAuthHash.startsWith('$2'))

  return hasValidPasswordHash === true
}

function getBestAuthHash(host: ProxyHost): string | null {
  if (
    host.basicAuthHash &&
    typeof host.basicAuthHash === 'string' &&
    host.basicAuthHash.startsWith('$2')
  ) {
    return host.basicAuthHash
  }

  if (
    host.basicAuthPassword &&
    typeof host.basicAuthPassword === 'string' &&
    host.basicAuthPassword.startsWith('$2')
  ) {
    return host.basicAuthPassword
  }

  return null
}

/**
 * Generates a complete Caddy server configuration from proxy host definitions
 *
 * @param {ProxyHost[]} hosts - Array of proxy host configurations
 * @returns {Promise<CaddyConfig>} Generated Caddy configuration
 */
export async function generateCaddyConfig(hosts: ProxyHost[]): Promise<CaddyConfig> {
  const routes: CaddyRoute[] = []
  const fixedHosts = fixNullObjectPasswords(hosts)

  const hostsWithValidAuth = fixedHosts.filter(
    (host) => host.enabled && hasValidBasicAuth(host)
  ).length

  caddyLogger.info(
    {
      hostCount: hosts.length,
      enabledHostCount: fixedHosts.filter((h) => h.enabled).length,
      basicAuthHostCount: fixedHosts.filter((h) => h.enabled && h.basicAuthEnabled).length,
      hostsWithValidAuth
    },
    'Generating Caddy configuration'
  )

  for (const host of fixedHosts) {
    if (!host.enabled) {
      caddyLogger.debug({ domain: host.domain }, 'Skipping disabled host')
      continue
    }

    const hasAuth = hasValidBasicAuth(host)
    const authHash = getBestAuthHash(host)

    caddyLogger.debug(
      {
        domain: host.domain,
        targetHost: host.targetHost,
        targetPort: host.targetPort,
        basicAuthEnabled: host.basicAuthEnabled,
        hasUsername: !!host.basicAuthUsername,
        hasValidAuth: hasAuth,
        hasPasswordField: !!host.basicAuthPassword,
        hasHashField: !!host.basicAuthHash,
        hashFormat: authHash ? authHash.substring(0, 6) + '...' : 'none'
      },
      'Processing host for Caddy configuration'
    )
    const route: CaddyRoute = {
      match: [
        {
          host: [host.domain]
        }
      ],
      handle: []
    }

    if (hasAuth && authHash) {
      caddyLogger.debug(
        {
          domain: host.domain,
          username: host.basicAuthUsername,
          hashFormat: authHash.substring(0, 6) + '...'
        },
        'Setting up basic auth with valid bcrypt hash'
      )

      route.handle.push({
        handler: 'authentication',
        providers: {
          http_basic: {
            hash: {
              algorithm: 'bcrypt'
            },
            accounts: [
              {
                username: host.basicAuthUsername as string,
                password: authHash
              }
            ],
            realm: 'Restricted'
          }
        }
      })

      caddyLogger.debug(
        {
          authHandler: 'authentication',
          username: host.basicAuthUsername,
          passwordHashFormat: authHash.substring(0, 6) + '...'
        },
        'Added authentication handler to route'
      )
    } else if (host.basicAuthEnabled) {
      caddyLogger.warn(
        {
          domain: host.domain,
          hasUsername: !!host.basicAuthUsername,
          username: host.basicAuthUsername,
          hasPasswordField: !!host.basicAuthPassword,
          hasHashField: !!host.basicAuthHash
        },
        'Basic auth is enabled but missing valid credentials. Authentication will not be applied.'
      )
    }
    const cleanTargetHost = host.targetHost
      .replace(/^https?:\/\//, '')
      .replace(/^\/+|\/+$/g, '')
      .trim()
    const dialAddress = `${cleanTargetHost}:${host.targetPort}`
    const proxyHandler: CaddyHandler = {
      handler: 'reverse_proxy',
      upstreams: [{ dial: dialAddress }],
      transport: {
        protocol: 'http',
        tls:
          host.targetProtocol === 'https'
            ? {
                insecure_skip_verify: host.ignoreInvalidCert || false
              }
            : undefined
      }
    }
    route.handle.push(proxyHandler)
    if (host.advancedConfig) {
      const advancedRoutes = parseAdvancedConfig(host.advancedConfig)
      advancedRoutes.forEach((advRoute) => {
        advRoute.match.forEach((match) => {
          match.host = [host.domain]
        })
      })
      routes.push(...advancedRoutes)
    }
    routes.push(route)
  }
  const config: CaddyConfig = {
    admin: {
      listen: process.env.CADDY_ADMIN_LISTEN || '0.0.0.0:2019',
      disabled: false,
      enforce_origin: false,
      origins: ['*']
    },
    logging: {
      logs: {
        default: {
          level: 'INFO'
        }
      }
    },
    apps: {
      http: {
        servers: {
          srv0: {
            listen: [':80', ':443'],
            routes: routes,
            automatic_https: {
              disable: false
            },
            ...(hosts.some((h) => h.enabled && h.http2Support) && {
              protocols: ['h1', 'h2', 'h3']
            })
          }
        }
      },
      tls: {
        automation: {
          policies: [
            {
              subjects: hosts.filter((h) => h.enabled && h.sslEnabled).map((h) => h.domain),
              issuers: [
                {
                  module: 'acme',
                  challenges: {
                    http: {
                      alternate_port: 80
                    }
                  }
                }
              ]
            }
          ]
        },
        certificates: {
          automate: hosts.filter((h) => h.enabled && h.sslEnabled).map((h) => h.domain)
        }
      }
    }
  }
  return config
}

/**
 * Fetches from the Caddy API with optimized retries and efficient handling
 *
 * @param {string} endpoint - The API endpoint to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
async function fetchWithOptimizedRetry(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${CADDY_API_URL}${endpoint}`

  caddyLogger.debug(`Making request to Caddy API: ${url}`, {
    method: options.method || 'GET',
    bodyLength: options.body
      ? typeof options.body === 'string'
        ? options.body.length
        : 'non-string body'
      : 0
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

  try {
    return await retryWithBackoff(async () => {
      const fetchOptions = {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }

      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        const errorText = await response.text()

        if (response.status === 404) {
          caddyLogger.warn(`Caddy API endpoint not found: ${url}`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })

          throw new CaddyError(
            `Caddy API endpoint not found: ${url}`,
            `HTTP_${response.status}`,
            errorText
          )
        }

        throw new CaddyError(
          `Caddy API error: ${response.status} ${response.statusText}`,
          `HTTP_${response.status}`,
          errorText
        )
      }

      return response
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Applies a Caddy configuration with efficient error handling and validation
 *
 * @param {CaddyConfig} config - The Caddy configuration to apply
 * @returns {Promise<void>}
 */
export async function applyCaddyConfig(config: CaddyConfig): Promise<void> {
  try {
    validateCaddyConfig(config)

    caddyLogger.debug('Applying Caddy configuration...')

    await fetchWithOptimizedRetry(CADDY_ENDPOINTS.LOAD, {
      method: 'POST',
      body: JSON.stringify(config)
    })

    caddyLogger.info('Caddy configuration applied successfully')
  } catch (error) {
    if (error instanceof CaddyError) {
      if (error.code === 'HTTP_404') {
        caddyLogger.error(
          {
            error,
            code: error.code,
            message:
              'Caddy API endpoint not found. Please check that Caddy is running and the CADDY_API_URL environment variable is correct.'
          },
          'Failed to apply Caddy configuration - endpoint not found'
        )
      } else {
        caddyLogger.error(
          {
            error,
            code: error.code,
            details: error.details
          },
          'Failed to apply Caddy configuration'
        )
      }
    } else {
      caddyLogger.error({ error }, 'Unexpected error applying Caddy configuration')
    }
    throw error
  }
}

/**
 * Validates a Caddy configuration before applying
 *
 * @param {CaddyConfig} config - The configuration to validate
 * @throws {Error} If configuration is invalid
 */
function validateCaddyConfig(config: CaddyConfig): void {
  if (!config.apps?.http?.servers) {
    throw new Error('Invalid Caddy config: missing apps.http.servers')
  }

  Object.values(config.apps.http.servers).forEach((server) => {
    if (!server.listen || !Array.isArray(server.listen) || server.listen.length === 0) {
      throw new Error('Invalid Caddy config: server missing listen addresses')
    }

    if (!server.routes || !Array.isArray(server.routes)) {
      throw new Error('Invalid Caddy config: server missing routes')
    }
  })
}

/**
 * Gets certificate status with optimized handling
 *
 * @param {string} domain - The domain to check
 * @returns {Promise<CertificateInfo | null>} Certificate information
 */
export async function getCertificateStatus(domain: string): Promise<CertificateInfo | null> {
  try {
    const response = await fetchWithOptimizedRetry(`/certificates/${domain}`, {
      method: 'GET'
    })

    const certInfo = await response.json()
    return certInfo as CertificateInfo
  } catch (error) {
    if (error instanceof CaddyError && error.code === 'HTTP_404') {
      caddyLogger.debug({ domain }, 'No certificate found for domain')
      return null
    }

    caddyLogger.warn(
      {
        domain,
        error: error instanceof Error ? error.message : String(error)
      },
      'Error checking certificate status'
    )
    return null
  }
}

/**
 * Checks if Caddy server is running with improved reliability
 *
 * @returns {Promise<boolean>} True if Caddy is reachable
 */
async function checkCaddyConnectivity(): Promise<boolean> {
  try {
    await fetchWithOptimizedRetry(CADDY_ENDPOINTS.CONFIG, { method: 'GET' })
    return true
  } catch (error) {
    caddyLogger.debug(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to connect to Caddy API'
    )
    return false
  }
}

/**
 * Gets the current Caddy server status
 *
 * @returns {Promise<CaddyStatus>} The server status
 */
export async function getCaddyServerStatus(): Promise<{
  running: boolean
  version: string
  config?: CaddyConfig
}> {
  caddyLogger.debug(`Checking Caddy status at endpoint: ${CADDY_API_URL}${CADDY_ENDPOINTS.CONFIG}`)

  try {
    const response = await fetch(`${CADDY_API_URL}${CADDY_ENDPOINTS.CONFIG}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })

    const isRunning = response.ok
    caddyLogger.debug(
      {
        caddyApiUrl: CADDY_API_URL,
        connected: isRunning,
        statusCode: response.status,
        statusText: response.statusText
      },
      `Caddy is ${isRunning ? 'running' : 'not running'} - ${isRunning ? 'successful' : 'failed'} response from ${CADDY_API_URL}${CADDY_ENDPOINTS.CONFIG} with status: ${response.status}`
    )

    let config
    if (isRunning) {
      try {
        config = await response.json()
      } catch (parseError) {
        caddyLogger.debug({ error: parseError }, 'Could not parse Caddy config response')
      }
    }

    return {
      running: isRunning,
      version: '2.x',
      config
    }
  } catch (error) {
    caddyLogger.warn(
      {
        error,
        errorMessage: error instanceof Error ? error.message : 'unknown error',
        caddyApiUrl: CADDY_API_URL
      },
      'Error connecting to Caddy API - check if Caddy is running and accessible'
    )

    return {
      running: false,
      version: 'Unknown'
    }
  }
}

/**
 * Reloads the Caddy configuration with optimized performance
 *
 * @param {ProxyHost[]} hosts - The proxy hosts to configure
 * @returns {Promise<void>}
 */
export async function reloadCaddyConfig(hosts: ProxyHost[]): Promise<void> {
  const fixedHosts = fixNullObjectPasswords(hosts)

  try {
    const isRunning = await checkCaddyConnectivity()
    if (!isRunning) {
      caddyLogger.warn('Cannot reload Caddy config: server not running')
      return
    }

    const config = await generateCaddyConfig(fixedHosts)
    await applyCaddyConfig(config)

    caddyLogger.info(
      {
        hostCount: fixedHosts.length,
        domains: fixedHosts.map((h) => h.domain).join(', ')
      },
      'Caddy configuration reload completed successfully'
    )
  } catch (error) {
    caddyLogger.error({ error }, 'Failed to reload Caddy configuration')
    throw error
  }
}
