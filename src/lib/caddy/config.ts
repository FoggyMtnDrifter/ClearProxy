import { proxyHosts } from '../db/schema'
import type { InferModel } from 'drizzle-orm'
import { caddyLogger } from '../logger'
import { generateCaddyHash as _generateCaddyHash } from '../auth/password'
import { fixNullObjectPasswords } from '../db'
const CADDY_API_URL = process.env.CADDY_API_URL || 'http://localhost:2019'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 5000
type ProxyHost = InferModel<typeof proxyHosts>
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64')
}
function _bcryptHash(password: string): string {
  return `$2a$14$${base64Encode(password)}`
}
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
interface CaddyRoute {
  match: CaddyMatch[]
  handle: CaddyHandler[]
  terminal?: boolean
}
interface CaddyServerConfig {
  listen: string[]
  routes: CaddyRoute[]
  automatic_https: {
    disable: boolean
  }
  tls_connection_policies?: Record<string, unknown>[]
}
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
interface CertificateInfo {
  managed: boolean
  issuer: string
  notBefore: string
  notAfter: string
  error?: string
}
class CaddyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'CaddyError'
  }
}
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (retries <= 0) throw error
    const nextDelay = Math.min(delay + INITIAL_RETRY_DELAY, MAX_RETRY_DELAY)
    caddyLogger.warn(
      { error, retriesLeft: retries - 1, nextDelay },
      'Operation failed, retrying...'
    )
    await sleep(delay)
    return retryWithBackoff(operation, retries - 1, nextDelay)
  }
}
function parseAdvancedConfig(config: string): CaddyRoute[] {
  if (!config) return []
  try {
    const parsedConfig = JSON.parse(config)
    const routes: CaddyRoute[] = []
    if (Array.isArray(parsedConfig)) {
      for (const routeConfig of parsedConfig) {
        if (routeConfig.match && routeConfig.handle) {
          const match = Array.isArray(routeConfig.match) ? routeConfig.match : [routeConfig.match]
          match.forEach((m: CaddyMatch) => {
            if (!m.host) m.host = []
          })
          routes.push({
            match,
            handle: routeConfig.handle,
            terminal: routeConfig.terminal
          })
        }
      }
      return routes
    }
    if (parsedConfig.redir && Array.isArray(parsedConfig.redir)) {
      for (const redir of parsedConfig.redir) {
        if (redir.from && redir.to) {
          routes.push({
            match: [
              {
                host: [],
                path: [redir.from]
              }
            ],
            handle: [
              {
                handler: 'static_response',
                status_code: redir.status_code || 301,
                headers: {
                  Location: [redir.to]
                }
              }
            ],
            terminal: true
          })
        }
      }
      return routes
    }
    if (parsedConfig.match && parsedConfig.handle) {
      const match = Array.isArray(parsedConfig.match) ? parsedConfig.match : [parsedConfig.match]
      match.forEach((m: CaddyMatch) => {
        if (!m.host) m.host = []
      })
      routes.push({
        match,
        handle: parsedConfig.handle,
        terminal: parsedConfig.terminal
      })
      return routes
    }
    if (parsedConfig.handler) {
      routes.push({
        match: [
          {
            host: []
          }
        ],
        handle: [parsedConfig],
        terminal: parsedConfig.terminal
      })
      return routes
    }
    caddyLogger.warn({ config }, 'Advanced configuration format not recognized')
    return []
  } catch (error) {
    caddyLogger.error({ error, config }, 'Failed to parse advanced configuration')
    return []
  }
}
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
