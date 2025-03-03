/**
 * Caddy server configuration module.
 * Handles generation, application, and management of Caddy reverse proxy configurations.
 * @module caddy/config
 */
import { proxyHosts } from '../db/schema'
import type { InferModel } from 'drizzle-orm'
import { caddyLogger } from '../logger'
import { generateCaddyHash as _generateCaddyHash } from '../auth/password'
import { fixNullObjectPasswords } from '../db'

/** Base URL for the Caddy API */
const CADDY_API_URL = process.env.CADDY_API_URL || 'http://localhost:2019'

/** Maximum number of retries for Caddy API operations */
const MAX_RETRIES = 3

/** Initial delay between retries in milliseconds */
const INITIAL_RETRY_DELAY = 1000

/** Maximum delay between retries in milliseconds */
const MAX_RETRY_DELAY = 5000

/** Type representing a proxy host from the database */
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
  /** Array of hostnames to match */
  host: string[]
  /** Protocol to match (e.g., "https") */
  protocol?: string
  /** Array of path patterns to match */
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
  /** Conditions to match for this route */
  match: CaddyMatch[]
  /** Handlers to process matching requests */
  handle: CaddyHandler[]
  /** Whether this is a terminal route that stops processing */
  terminal?: boolean
}

/**
 * Interface representing configuration for a Caddy server instance
 */
interface CaddyServerConfig {
  /** Network addresses to listen on */
  listen: string[]
  /** Routes for request processing */
  routes: CaddyRoute[]
  /** Automatic HTTPS configuration */
  automatic_https: {
    /** Whether to disable automatic HTTPS */
    disable: boolean
  }
  /** TLS connection policies, if any */
  tls_connection_policies?: Record<string, unknown>[]
}

/**
 * Interface representing Caddy TLS configuration for certificate management
 */
interface CaddyTLSConfig {
  /** Certificate configuration */
  certificates?: {
    /** Domains to automatically obtain certificates for */
    automate: string[]
  }
  /** Certificate automation policy configuration */
  automation?: {
    /** Certificate issuance policies */
    policies: {
      /** Domains subject to this policy */
      subjects: string[]
      /** Certificate issuers to use */
      issuers: {
        /** Issuer module to use */
        module: string
        /** Challenge configurations */
        challenges: {
          /** HTTP challenge configuration */
          http: {
            /** Alternate port for HTTP challenges */
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
  /** Admin API configuration */
  admin: {
    /** Address for the admin API to listen on */
    listen: string
    /** Whether the admin API is disabled */
    disabled: boolean
    /** Whether to enforce allowed origins */
    enforce_origin?: boolean
    /** Allowed origins for admin API requests */
    origins?: string[]
  }
  /** Logging configuration */
  logging?: {
    /** Log definitions */
    logs: {
      /** Default logger configuration */
      default: {
        /** Log level */
        level: string
      }
    }
  }
  /** Caddy applications configuration */
  apps: {
    /** HTTP server configuration */
    http: {
      /** Server instances */
      servers: {
        /** Server configurations indexed by name */
        [key: string]: CaddyServerConfig
      }
    }
    /** TLS configuration, if any */
    tls?: CaddyTLSConfig
  }
}

/**
 * Interface representing information about a TLS certificate
 */
interface CertificateInfo {
  /** Whether the certificate is managed by Caddy */
  managed: boolean
  /** Certificate issuer */
  issuer: string
  /** Certificate validity start date */
  notBefore: string
  /** Certificate expiration date */
  notAfter: string
  /** Error information, if any */
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
      // Exponential backoff with maximum cap
      delay = Math.min(delay * 2, MAX_RETRY_DELAY)
    }
  }

  throw lastError
}

/**
 * Parses advanced Caddy configuration from a JSON string
 * Allows for custom routing rules beyond the standard proxy configuration
 *
 * @param {string} config - JSON string containing advanced Caddy configuration
 * @returns {CaddyRoute[]} Array of parsed Caddy routes
 */
function parseAdvancedConfig(config: string): CaddyRoute[] {
  if (!config) return []

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
    } else {
      caddyLogger.warn('Invalid advanced config format, expected array or object with routes array')
      return []
    }
  } catch (error) {
    caddyLogger.error({ error }, 'Failed to parse advanced configuration')
    return []
  }
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
  caddyLogger.info(
    {
      hostCount: hosts.length,
      enabledHostCount: fixedHosts.filter((h) => h.enabled).length,
      basicAuthHostCount: fixedHosts.filter((h) => h.enabled && h.basicAuthEnabled).length,
      hostsWithValidAuth: fixedHosts.filter(
        (h) =>
          h.enabled &&
          h.basicAuthEnabled &&
          h.basicAuthUsername &&
          h.basicAuthPassword &&
          typeof h.basicAuthPassword === 'string' &&
          h.basicAuthPassword.startsWith('$2')
      ).length
    },
    'Generating Caddy configuration'
  )
  for (const host of fixedHosts) {
    if (!host.enabled) {
      caddyLogger.debug({ domain: host.domain }, 'Skipping disabled host')
      continue
    }
    caddyLogger.debug(
      {
        domain: host.domain,
        targetHost: host.targetHost,
        targetPort: host.targetPort,
        basicAuthEnabled: host.basicAuthEnabled,
        hasUsername: !!host.basicAuthUsername,
        hasPassword: !!host.basicAuthPassword,
        passwordType: typeof host.basicAuthPassword,
        validBcrypt: host.basicAuthPassword?.startsWith('$2')
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
    if (host.basicAuthEnabled && host.basicAuthUsername) {
      const isValidPasswordHash =
        host.basicAuthPassword !== null &&
        host.basicAuthPassword !== undefined &&
        typeof host.basicAuthPassword === 'string' &&
        host.basicAuthPassword.length > 0 &&
        host.basicAuthPassword.startsWith('$2')
      const isNullPassword =
        host.basicAuthPassword === null ||
        (typeof host.basicAuthPassword === 'object' && host.basicAuthPassword === null)
      if (isValidPasswordHash) {
        caddyLogger.debug(
          {
            domain: host.domain,
            basicAuthEnabled: host.basicAuthEnabled,
            hasUsername: !!host.basicAuthUsername,
            username: host.basicAuthUsername,
            hasValidHash: isValidPasswordHash,
            passwordType: typeof host.basicAuthPassword,
            passwordHashStart: host.basicAuthPassword?.substring(0, 6) + '...',
            isNullPassword
          },
          'Setting up basic auth with valid bcrypt hash'
        )
        const passwordHash =
          typeof host.basicAuthPassword === 'string' ? host.basicAuthPassword : ''
        route.handle.push({
          handler: 'authentication',
          providers: {
            http_basic: {
              hash: {
                algorithm: 'bcrypt'
              },
              accounts: [
                {
                  username: host.basicAuthUsername,
                  password: passwordHash
                }
              ],
              realm: 'Restricted'
            }
          }
        })
        caddyLogger.debug(
          {
            authHandler: JSON.stringify(route.handle[route.handle.length - 1].handler),
            realm: route.handle[route.handle.length - 1].providers?.http_basic?.realm,
            accountCount:
              route.handle[route.handle.length - 1].providers?.http_basic?.accounts?.length,
            bcryptHashFormat: passwordHash.startsWith('$2')
          },
          'Added authentication handler to route'
        )
      } else {
        caddyLogger.warn(
          {
            domain: host.domain,
            basicAuthEnabled: host.basicAuthEnabled,
            hasUsername: !!host.basicAuthUsername,
            username: host.basicAuthUsername,
            passwordExists: !!host.basicAuthPassword,
            passwordType: typeof host.basicAuthPassword,
            passwordIsNull: host.basicAuthPassword === null,
            passwordIsUndefined: host.basicAuthPassword === undefined,
            passwordRawValue:
              host.basicAuthPassword === null
                ? 'null'
                : host.basicAuthPassword === undefined
                  ? 'undefined'
                  : typeof host.basicAuthPassword === 'object'
                    ? 'object (possibly SQLite NULL)'
                    : host.basicAuthPassword === ''
                      ? 'empty string'
                      : host.basicAuthPassword?.startsWith('$2')
                        ? 'valid bcrypt'
                        : 'invalid format',
            passwordLength:
              typeof host.basicAuthPassword === 'string' ? host.basicAuthPassword.length : 0,
            validationChecks: {
              notNull: host.basicAuthPassword !== null,
              notUndefined: host.basicAuthPassword !== undefined,
              isString: typeof host.basicAuthPassword === 'string',
              startsWithBcrypt:
                typeof host.basicAuthPassword === 'string' &&
                host.basicAuthPassword.startsWith('$2'),
              isNullPassword
            }
          },
          'Cannot set up basic auth without a valid bcrypt password hash. Authentication will not be applied.'
        )
      }
    } else if (host.basicAuthEnabled) {
      caddyLogger.warn(
        {
          domain: host.domain,
          basicAuthEnabled: host.basicAuthEnabled,
          hasUsername: !!host.basicAuthUsername,
          hasPassword: !!host.basicAuthPassword,
          usernameValue: host.basicAuthUsername || 'undefined'
        },
        'Basic auth is enabled but missing username. Authentication will not be applied.'
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
 * Applies a configuration to the running Caddy server via its API
 *
 * @param {CaddyConfig} config - Caddy configuration to apply
 * @returns {Promise<void>} Promise that resolves when the config is applied
 * @throws {CaddyError} If the config cannot be applied
 */
export async function applyCaddyConfig(config: CaddyConfig): Promise<void> {
  try {
    await retryWithBackoff(async () => {
      const currentConfig = await fetch(`${CADDY_API_URL}/config/`).then((r) =>
        r.ok ? r.json() : null
      )
      if (currentConfig?.admin) {
        config.admin = currentConfig.admin
      }
      const configJson = JSON.stringify(config)
      caddyLogger.debug(
        {
          url: `${CADDY_API_URL}/load`,
          configLength: configJson.length,
          adminConfig: config.admin,
          routeCount: config.apps?.http?.servers?.srv0?.routes?.length,
          routeWithAuth: config.apps?.http?.servers?.srv0?.routes?.some((r) =>
            r.handle?.some((h) => h.handler === 'authentication')
          ),
          authHandlers: config.apps?.http?.servers?.srv0?.routes
            ?.filter((r) => r.handle?.some((h) => h.handler === 'authentication'))
            ?.map((r) => ({
              domain: r.match?.[0]?.host?.[0],
              auth: r.handle?.find((h) => h.handler === 'authentication')
            }))
        },
        'Sending configuration to Caddy API with authentication details'
      )
      const response = await fetch(`${CADDY_API_URL}/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: configJson
      })
      if (!response.ok) {
        const error = await response.text()
        caddyLogger.error(
          {
            statusCode: response.status,
            statusText: response.statusText,
            error,
            requestUrl: `${CADDY_API_URL}/load`,
            configSample: configJson.substring(0, 500) + '...'
          },
          'Caddy API returned error response'
        )
        throw new CaddyError(
          `Failed to apply Caddy configuration: ${error}`,
          'CONFIG_APPLY_ERROR',
          { statusCode: response.status, error }
        )
      }
      caddyLogger.info('Successfully applied Caddy configuration')
    })
  } catch (error) {
    caddyLogger.error(
      {
        error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorStack: error instanceof Error ? error.stack : 'unknown',
        errorCause: error instanceof Error ? error.cause : undefined,
        caddyApiUrl: CADDY_API_URL
      },
      'Failed to apply Caddy configuration'
    )
    if (error instanceof CaddyError) {
      throw error
    }
    throw new CaddyError(
      'Failed to apply Caddy configuration after retries',
      'CONFIG_APPLY_ERROR',
      error
    )
  }
}

/**
 * Gets the status of a TLS certificate for a domain
 *
 * @param {string} domain - Domain to check certificate status for
 * @returns {Promise<CertificateInfo | null>} Certificate information or null if not found
 */
export async function getCertificateStatus(domain: string): Promise<CertificateInfo | null> {
  try {
    const response = await fetch(`${CADDY_API_URL}/certificates/${domain}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to get certificate info: ${response.statusText}`)
    }
    const data = await response.json()
    return {
      managed: data.managed ?? false,
      issuer: data.issuer ?? 'Unknown',
      notBefore: data.not_before ?? '',
      notAfter: data.not_after ?? '',
      error: data.error
    }
  } catch (error) {
    caddyLogger.warn('Failed to get certificate status', { domain, error })
    return null
  }
}

/**
 * Reloads the Caddy configuration with the current proxy hosts
 * Generates a new config and applies it to the running Caddy server
 *
 * @param {ProxyHost[]} hosts - Array of proxy host configurations
 * @returns {Promise<void>} Promise that resolves when the config is reloaded
 */
export async function reloadCaddyConfig(hosts: ProxyHost[]): Promise<void> {
  try {
    const fixedHosts = fixNullObjectPasswords(hosts)
    caddyLogger.debug(
      {
        hosts: fixedHosts.map((h) => ({
          id: h.id,
          domain: h.domain,
          enabled: h.enabled,
          targetHost: h.targetHost,
          targetPort: h.targetPort,
          basicAuthEnabled: h.basicAuthEnabled,
          hasUsername: !!h.basicAuthUsername,
          username: h.basicAuthUsername || 'none',
          hasPassword: !!h.basicAuthPassword,
          passwordType: typeof h.basicAuthPassword,
          passwordTypeCheck: {
            isString: typeof h.basicAuthPassword === 'string',
            isNull: h.basicAuthPassword === null,
            isObject: typeof h.basicAuthPassword === 'object' && h.basicAuthPassword !== null
          },
          passwordValue:
            h.basicAuthPassword === null
              ? 'null'
              : h.basicAuthPassword === undefined
                ? 'undefined'
                : typeof h.basicAuthPassword !== 'string'
                  ? `non-string (${typeof h.basicAuthPassword})`
                  : h.basicAuthPassword === ''
                    ? 'empty string'
                    : 'has value',
          validBcrypt:
            typeof h.basicAuthPassword === 'string' && h.basicAuthPassword.startsWith('$2'),
          passwordLength: typeof h.basicAuthPassword === 'string' ? h.basicAuthPassword.length : 0
        }))
      },
      'Attempting to reload Caddy configuration with detailed host info'
    )
    const config = await generateCaddyConfig(fixedHosts)
    caddyLogger.debug(
      {
        config,
        configStr: JSON.stringify(config).substring(0, 200) + '...'
      },
      'Generated Caddy configuration'
    )
    await applyCaddyConfig(config)
    caddyLogger.info('Successfully reloaded Caddy configuration', {
      hostCount: hosts.length,
      activeHosts: fixedHosts.filter((h) => h.enabled).length,
      hostsWithBasicAuth: fixedHosts.filter((h) => h.enabled && h.basicAuthEnabled).length
    })
  } catch (error) {
    caddyLogger.error(
      {
        error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorStack: error instanceof Error ? error.stack : 'unknown',
        hosts: hosts.map((h) => ({
          id: h.id,
          domain: h.domain,
          enabled: h.enabled,
          targetHost: h.targetHost,
          targetPort: h.targetPort
        }))
      },
      'Failed to reload Caddy configuration'
    )
    throw error
  }
}

/**
 * Gets the current status of the Caddy server
 * Includes whether it's running, its version, and current config
 *
 * @returns {Promise<{running: boolean, version: string, config?: CaddyConfig}>} Caddy status information
 */
export async function getCaddyStatus(): Promise<{
  running: boolean
  version: string
  config?: CaddyConfig
}> {
  const endpoints = ['/config/', '/', '/admin/ping']
  let lastError: Error | null = null
  for (const endpoint of endpoints) {
    try {
      const url = `${CADDY_API_URL}${endpoint}`
      caddyLogger.debug(`Checking Caddy status at endpoint: ${url}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      if (response.ok || response.status === 404) {
        caddyLogger.debug(
          `Caddy is running - successful response from ${url} with status: ${response.status}`
        )
        if (endpoint === '/config/' && response.ok) {
          try {
            const data = await response.json()
            return {
              running: true,
              version: data.server?.version || 'unknown',
              config: data
            }
          } catch (parseError) {
            caddyLogger.debug('Could not parse Caddy config response', { error: parseError })
            return { running: true, version: 'unknown' }
          }
        }
        return { running: true, version: 'unknown' }
      }
      caddyLogger.debug(`Caddy endpoint ${url} returned error status: ${response.status}`)
      lastError = new Error(`Status code: ${response.status}`)
    } catch (error) {
      caddyLogger.debug(`Error checking Caddy at ${endpoint}`, { error })
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }
  caddyLogger.debug('Failed to connect to any Caddy API endpoint', {
    error: lastError,
    triedEndpoints: endpoints
  })
  return { running: false, version: 'unknown' }
}
