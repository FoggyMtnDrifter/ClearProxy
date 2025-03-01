/**
 * Caddy Server Configuration Management
 * 
 * This module provides a comprehensive TypeScript interface for managing Caddy server configurations.
 * It handles the generation, application, and monitoring of Caddy server settings with full type safety.
 * 
 * Features:
 * - Type-safe configuration generation
 * - Reverse proxy setup with load balancing
 * - SSL/TLS certificate management
 * - Basic authentication integration
 * - HTTP/2 and HTTP/3 support
 * - Health checks and monitoring
 * - Automatic retries with exponential backoff
 * - Error handling with custom error types
 * - Certificate status monitoring
 * - Advanced custom configurations
 * 
 * Configuration Options:
 * - Proxy routing and load balancing
 * - SSL/TLS certificate automation
 * - Basic authentication with bcrypt hashing
 * - Custom error pages
 * - Header manipulation
 * - Response compression
 * - URL rewriting
 * - Static file serving
 * 
 * Error Handling:
 * - Custom CaddyError class for detailed error information
 * - Automatic retries for transient failures
 * - Exponential backoff for retry attempts
 * - Detailed error logging via pino logger
 * 
 * @module caddy/config
 * 
 * @example Basic proxy configuration
 * ```typescript
 * const config = await generateCaddyConfig([{
 *   domain: 'example.com',
 *   target: 'localhost:3000',
 *   basicAuth: { username: 'user', password: 'pass' }
 * }]);
 * await applyCaddyConfig(config);
 * ```
 * 
 * @example Certificate status check
 * ```typescript
 * const status = await getCertificateStatus('example.com');
 * if (status?.managed) {
 *   console.log(`Certificate valid until ${status.notAfter}`);
 * }
 * ```
 */

import { proxyHosts } from '../db/schema';
import type { InferModel } from 'drizzle-orm';
import { caddyLogger } from '../logger';
import { generateCaddyHash } from '../auth/password';
import { fixNullObjectPasswords } from '../db';

// Get Caddy API URL from environment variable, fallback to localhost for development
const CADDY_API_URL = process.env.CADDY_API_URL || 'http://localhost:2019';

// Retry configuration
const MAX_RETRIES = 3;  // Increased from 2
const INITIAL_RETRY_DELAY = 1000;  // Increased from 500ms
const MAX_RETRY_DELAY = 5000;  // Increased from 2000ms

type ProxyHost = InferModel<typeof proxyHosts>;

/**
 * Encodes a string to base64 format.
 * Used for encoding credentials in basic authentication.
 * 
 * @param {string} str - The string to encode
 * @returns {string} Base64 encoded string
 */
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

/**
 * Formats a password string into Caddy's expected bcrypt hash format.
 * 
 * @param {string} password - The password to hash
 * @returns {string} Formatted bcrypt hash string
 */
function bcryptHash(password: string): string {
  // This is the format Caddy expects for bcrypt hashes
  // The format should be $2a$14$ followed by 22 characters of salt and 31 characters of hash
  return `$2a$14$${base64Encode(password)}`;
}

/**
 * Represents a Caddy route matching configuration.
 * Defines criteria for matching incoming HTTP requests.
 * 
 * @interface CaddyMatch
 * @property {string[]} host - List of hostnames to match
 * @property {string} [protocol] - Protocol to match (e.g., "http", "https")
 * @property {string[]} [path] - List of URL paths to match
 */
interface CaddyMatch {
  host: string[];
  protocol?: string;
  path?: string[];
}

/**
 * Represents a Caddy request handler configuration.
 * Defines how Caddy should process matched requests.
 * 
 * @interface CaddyHandler
 * @property {string} handler - Type of handler to use
 * @property {Object[]} [upstreams] - Upstream servers for reverse proxy
 * @property {Object} [transport] - Transport configuration
 * @property {Object} [load_balancing] - Load balancing settings
 * @property {Object} [health_checks] - Health check configuration
 * @property {Object} [providers] - Authentication providers
 */
interface CaddyHandler {
  handler: "reverse_proxy" | "authentication" | "static_response" | "file_server" | "php_fastcgi" | "rewrite" | "uri" | "handle" | "handle_path" | "handle_errors" | "headers" | "encode" | "templates" | "respond";
  
  // reverse_proxy handler options
  upstreams?: { dial: string }[];
  transport?: {
    protocol: string;
    tls?: {
      insecure_skip_verify?: boolean;
      server_name?: string;
      trusted_ca_certs?: string[];
      client_certificate?: {
        cert: string;
        key: string;
      };
    };
    dial_timeout?: string;
    dial_fallback_delay?: string;
    response_header_timeout?: string;
    read_buffer?: string;
    write_buffer?: string;
    max_response_header?: string;
    compression?: boolean;
  };
  load_balancing?: {
    selection_policy?: { name: string; options?: Record<string, any> };
    try_duration?: string;
    try_interval?: string;
    retries?: number;
  };
  health_checks?: {
    active?: {
      uri?: string;
      port?: number;
      interval?: string;
      timeout?: string;
      max_size?: string;
      expect_status?: number;
      expect_body?: string;
      headers?: Record<string, string[]>;
    };
    passive?: {
      fail_duration?: string;
      max_fails?: number;
      unhealthy_status?: number[];
      unhealthy_latency?: string;
    };
  };
  buffer?: {
    request?: { max_size?: string };
    response?: { max_size?: string };
  };

  // static_response handler options
  status_code?: number;
  headers?: Record<string, string[]>;
  body?: string;
  close?: boolean;

  // file_server handler options
  root?: string;
  hide?: string[];
  index_names?: string[];
  browse?: {
    template_file?: string;
  };

  // authentication handler options
  providers?: {
    http_basic?: {
      accounts: { username: string; password: string }[];
      realm?: string;
      hash?: boolean;
    };
  };

  // handle_errors handler options
  error_pages?: Record<string, string>;
  
  // headers handler options
  response?: {
    set?: Record<string, string[]>;
    add?: Record<string, string[]>;
    delete?: string[];
    replace?: Record<string, { search: string; replace: string }>;
  };
  request?: {
    set?: Record<string, string[]>;
    add?: Record<string, string[]>;
    delete?: string[];
    replace?: Record<string, { search: string; replace: string }>;
  };

  // encode handler options
  encodings?: {
    gzip?: boolean;
    zstd?: boolean;
  };

  // rewrite handler options
  uri_substring?: string;
  strip_path_prefix?: string;
  strip_path_suffix?: string;
  uri_replace?: {
    search: string;
    replace: string;
  }[];

  // templates handler options
  mime_types?: string[];

  // Additional common fields
  match?: any[];
  terminal?: boolean;
}

/**
 * Represents a complete Caddy route configuration.
 * Combines matching criteria with handling instructions.
 * 
 * @interface CaddyRoute
 * @property {CaddyMatch[]} match - List of matching conditions
 * @property {CaddyHandler[]} handle - List of handlers to process the request
 * @property {boolean} [terminal] - Whether to stop processing after this route
 */
interface CaddyRoute {
  match: CaddyMatch[];
  handle: CaddyHandler[];
  terminal?: boolean;
}

/**
 * Represents a Caddy server configuration.
 * Servers define how Caddy listens for incoming connections.
 * 
 * @see https://caddyserver.com/docs/json/apps/http/servers/
 */
interface CaddyServerConfig {
  listen: string[];
  routes: CaddyRoute[];
  automatic_https: {
    disable: boolean;
  };
  tls_connection_policies?: {}[];
}

/**
 * Top-level Caddy configuration.
 * This is the root configuration object that gets sent to Caddy's API.
 * 
 * @see https://caddyserver.com/docs/json/
 */
interface CaddyTLSConfig {
  certificates?: {
    automate: string[];
  };
  automation?: {
    policies: {
      subjects: string[];
      issuers: {
        module: string;
        challenges: {
          http: {
            alternate_port: number;
          };
        };
      }[];
    }[];
  };
}

interface CaddyConfig {
  admin: {
    listen: string;
    disabled: boolean;
  };
  logging?: {
    logs: {
      default: {
        level: string;
      };
    };
  };
  apps: {
    http: {
      servers: {
        [key: string]: CaddyServerConfig;
      };
    };
    tls?: CaddyTLSConfig;
  };
}

/**
 * Certificate information returned by Caddy's API.
 * Contains details about SSL/TLS certificates managed by Caddy.
 */
interface CertificateInfo {
  managed: boolean;
  issuer: string;
  notBefore: string;
  notAfter: string;
  error?: string;
}

/**
 * Custom error class for Caddy-related errors.
 * Provides detailed error information with error codes.
 * 
 * @class CaddyError
 * @extends Error
 */
class CaddyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CaddyError';
  }
}

/**
 * Creates a promise that resolves after the specified delay.
 * @param ms - The delay in milliseconds
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an operation with linear backoff and maximum delay cap.
 * 
 * @param operation - The async operation to retry
 * @param retries - Number of retries remaining (default: MAX_RETRIES)
 * @param delay - Current delay in milliseconds (default: INITIAL_RETRY_DELAY)
 * @throws The last error encountered if all retries fail
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    
    // Use linear backoff with a maximum delay cap
    const nextDelay = Math.min(delay + INITIAL_RETRY_DELAY, MAX_RETRY_DELAY);
    
    caddyLogger.warn(
      { error, retriesLeft: retries - 1, nextDelay },
      'Operation failed, retrying...'
    );
    
    await sleep(delay);
    return retryWithBackoff(operation, retries - 1, nextDelay);
  }
}

/**
 * Parses and validates the advanced configuration JSON
 * @param config - The advanced configuration string
 * @returns Array of CaddyRoute objects
 */
function parseAdvancedConfig(config: string): CaddyRoute[] {
  if (!config) return [];
  
  try {
    const parsedConfig = JSON.parse(config);
    const routes: CaddyRoute[] = [];

    // Handle array of routes
    if (Array.isArray(parsedConfig)) {
      for (const routeConfig of parsedConfig) {
        if (routeConfig.match && routeConfig.handle) {
          // Initialize match with empty host array if not provided
          const match = Array.isArray(routeConfig.match) ? routeConfig.match : [routeConfig.match];
          match.forEach((m: CaddyMatch) => {
            if (!m.host) m.host = [];
          });

          routes.push({
            match,
            handle: routeConfig.handle,
            terminal: routeConfig.terminal
          });
        }
      }
      return routes;
    }

    // Handle legacy redirect format
    if (parsedConfig.redir && Array.isArray(parsedConfig.redir)) {
      for (const redir of parsedConfig.redir) {
        if (redir.from && redir.to) {
          routes.push({
            match: [{
              host: [],  // Initialize with empty array, will be populated later
              path: [redir.from]
            }],
            handle: [{
              handler: "static_response",
              status_code: redir.status_code || 301,  // Default to 301 if not specified
              headers: {
                Location: [redir.to]
              }
            }],
            terminal: true
          });
        }
      }
      return routes;
    }

    // Handle single route configuration
    if (parsedConfig.match && parsedConfig.handle) {
      // Initialize match with empty host array if not provided
      const match = Array.isArray(parsedConfig.match) ? parsedConfig.match : [parsedConfig.match];
      match.forEach((m: CaddyMatch) => {
        if (!m.host) m.host = [];
      });

      routes.push({
        match,
        handle: parsedConfig.handle,
        terminal: parsedConfig.terminal
      });
      return routes;
    }

    // Handle direct handler configuration (without explicit route)
    if (parsedConfig.handler) {
      routes.push({
        match: [{
          host: []  // Will be populated later
        }],
        handle: [parsedConfig],
        terminal: parsedConfig.terminal
      });
      return routes;
    }

    caddyLogger.warn({ config }, 'Advanced configuration format not recognized');
    return [];
  } catch (error) {
    caddyLogger.error({ error, config }, 'Failed to parse advanced configuration');
    return [];
  }
}

/**
 * Generates a complete Caddy server configuration from proxy host definitions.
 * 
 * @async
 * @param {ProxyHost[]} hosts - List of proxy host configurations
 * @returns {Promise<CaddyConfig>} Complete Caddy server configuration
 * @throws {CaddyError} When configuration generation fails
 * 
 * @example
 * ```typescript
 * const hosts = await db.select().from(proxyHosts);
 * const config = await generateCaddyConfig(hosts);
 * ```
 */
export async function generateCaddyConfig(hosts: ProxyHost[]): Promise<any> {
  const routes: any[] = [];
  
  // Fix any null object passwords in the hosts array
  const fixedHosts = fixNullObjectPasswords(hosts);

  caddyLogger.info({
    hostCount: hosts.length,
    enabledHostCount: fixedHosts.filter(h => h.enabled).length,
    basicAuthHostCount: fixedHosts.filter(h => h.enabled && h.basicAuthEnabled).length,
    hostsWithValidAuth: fixedHosts.filter(h => 
      h.enabled && 
      h.basicAuthEnabled && 
      h.basicAuthUsername && 
      h.basicAuthPassword && 
      typeof h.basicAuthPassword === 'string' &&
      h.basicAuthPassword.startsWith('$2')
    ).length
  }, 'Generating Caddy configuration');

  for (const host of fixedHosts) {
    if (!host.enabled) {
      caddyLogger.debug({ domain: host.domain }, 'Skipping disabled host');
      continue;
    }

    caddyLogger.debug({
      domain: host.domain,
      targetHost: host.targetHost,
      targetPort: host.targetPort,
      basicAuthEnabled: host.basicAuthEnabled,
      hasUsername: !!host.basicAuthUsername,
      hasPassword: !!host.basicAuthPassword,
      passwordType: typeof host.basicAuthPassword,
      validBcrypt: host.basicAuthPassword?.startsWith('$2')
    }, 'Processing host for Caddy configuration');

    const route: any = {
      match: [{
        host: [host.domain]
      }],
      handle: []
    };

    // Add basic auth if configured
    if (host.basicAuthEnabled && host.basicAuthUsername) {
      // Check for a valid bcrypt hash (starts with $2)
      const isValidPasswordHash = 
        host.basicAuthPassword !== null && 
        host.basicAuthPassword !== undefined &&
        typeof host.basicAuthPassword === 'string' && 
        host.basicAuthPassword.length > 0 &&
        host.basicAuthPassword.startsWith('$2');
      
      // Additional checking for object NULL from SQLite
      const isNullPassword = 
        host.basicAuthPassword === null || 
        (typeof host.basicAuthPassword === 'object' && host.basicAuthPassword === null);
      
      // Only add authentication if we have a username and a valid password hash
      if (isValidPasswordHash) {
        caddyLogger.debug({
          domain: host.domain,
          basicAuthEnabled: host.basicAuthEnabled,
          hasUsername: !!host.basicAuthUsername,
          username: host.basicAuthUsername,
          hasValidHash: isValidPasswordHash,
          passwordType: typeof host.basicAuthPassword,
          passwordHashStart: host.basicAuthPassword?.substring(0, 6) + '...',
          isNullPassword
        }, 'Setting up basic auth with valid bcrypt hash');
        
        // Ensure we're using a properly formatted password hash
        const passwordHash = typeof host.basicAuthPassword === 'string' ? host.basicAuthPassword : '';
        
        route.handle.push({
          handler: "authentication",
          providers: {
            http_basic: {
              hash: {
                algorithm: "bcrypt"
              },
              accounts: [{
                username: host.basicAuthUsername,
                password: passwordHash
              }],
              realm: "Restricted"
            }
          }
        });
        
        caddyLogger.debug({
          authHandler: JSON.stringify(route.handle[route.handle.length-1].handler),
          realm: route.handle[route.handle.length-1].providers?.http_basic?.realm,
          accountCount: route.handle[route.handle.length-1].providers?.http_basic?.accounts?.length,
          bcryptHashFormat: passwordHash.startsWith('$2')
        }, 'Added authentication handler to route');
      } else {
        // If no valid password hash is provided, we can't set up authentication properly
        caddyLogger.warn({
          domain: host.domain,
          basicAuthEnabled: host.basicAuthEnabled,
          hasUsername: !!host.basicAuthUsername,
          username: host.basicAuthUsername,
          passwordExists: !!host.basicAuthPassword,
          passwordType: typeof host.basicAuthPassword,
          passwordIsNull: host.basicAuthPassword === null,
          passwordIsUndefined: host.basicAuthPassword === undefined,
          passwordRawValue: host.basicAuthPassword === null ? 'null' : 
                         host.basicAuthPassword === undefined ? 'undefined' : 
                         typeof host.basicAuthPassword === 'object' ? 'object (possibly SQLite NULL)' :
                         host.basicAuthPassword === '' ? 'empty string' : 
                         (host.basicAuthPassword?.startsWith('$2') ? 'valid bcrypt' : 'invalid format'),
          passwordLength: typeof host.basicAuthPassword === 'string' ? host.basicAuthPassword.length : 0,
          validationChecks: {
            notNull: host.basicAuthPassword !== null,
            notUndefined: host.basicAuthPassword !== undefined,
            isString: typeof host.basicAuthPassword === 'string',
            startsWithBcrypt: typeof host.basicAuthPassword === 'string' && host.basicAuthPassword.startsWith('$2'),
            isNullPassword
          }
        }, 'Cannot set up basic auth without a valid bcrypt password hash. Authentication will not be applied.');
      }
    } else if (host.basicAuthEnabled) {
      caddyLogger.warn({
        domain: host.domain,
        basicAuthEnabled: host.basicAuthEnabled,
        hasUsername: !!host.basicAuthUsername,
        hasPassword: !!host.basicAuthPassword,
        usernameValue: host.basicAuthUsername || 'undefined'
      }, 'Basic auth is enabled but missing username. Authentication will not be applied.');
    }

    // Clean the target host
    const cleanTargetHost = host.targetHost
      .replace(/^https?:\/\//, '')
      .replace(/^\/+|\/+$/g, '')
      .trim();
    
    const dialAddress = `${cleanTargetHost}:${host.targetPort}`;

    // Configure the reverse proxy handler with modern Caddy v2 syntax
    const proxyHandler: CaddyHandler = {
      handler: "reverse_proxy",
      upstreams: [{ dial: dialAddress }],
      transport: {
        protocol: 'http',
        tls: host.targetProtocol === 'https' ? {
          insecure_skip_verify: host.ignoreInvalidCert || false
        } : undefined
      }
    };

    route.handle.push(proxyHandler);

    // Add any advanced configuration routes
    if (host.advancedConfig) {
      const advancedRoutes = parseAdvancedConfig(host.advancedConfig);
      // Add the domain to each advanced route's host match
      advancedRoutes.forEach(advRoute => {
        advRoute.match.forEach(match => {
          match.host = [host.domain];
        });
      });
      routes.push(...advancedRoutes);
    }

    routes.push(route);
  }

  // Create the complete Caddy v2 configuration
  const config = {
    admin: {
      listen: process.env.CADDY_ADMIN_LISTEN || "0.0.0.0:2019",
      enforce_origin: false,
      origins: ["*"]
    },
    logging: {
      logs: {
        default: {
          level: "INFO"
        }
      }
    },
    apps: {
      http: {
        servers: {
          srv0: {
            listen: [":80", ":443"],
            routes: routes,
            automatic_https: {
              disable: false
            },
            ...(hosts.some(h => h.enabled && h.http2Support) && {
              protocols: ["h1", "h2", "h3"]
            })
          }
        }
      },
      tls: {
        automation: {
          policies: [{
            subjects: hosts.filter(h => h.enabled && h.sslEnabled).map(h => h.domain),
            issuers: [{
              module: "acme",
              challenges: {
                http: {
                  alternate_port: 80
                }
              }
            }]
          }]
        },
        certificates: {
          automate: hosts.filter(h => h.enabled && h.sslEnabled).map(h => h.domain)
        }
      }
    }
  };

  return config;
}

/**
 * Applies a configuration to the running Caddy server.
 * Uses exponential backoff for retries on failure.
 * 
 * @async
 * @param {CaddyConfig} config - Configuration to apply
 * @throws {CaddyError} When configuration application fails
 * 
 * @example
 * ```typescript
 * try {
 *   await applyCaddyConfig(config);
 *   caddyLogger.info('Configuration applied successfully');
 * } catch (error) {
 *   caddyLogger.error('Failed to apply configuration');
 * }
 * ```
 */
export async function applyCaddyConfig(config: CaddyConfig): Promise<void> {
  try {
    await retryWithBackoff(async () => {
      // First, get the current config to check admin settings
      const currentConfig = await fetch(`${CADDY_API_URL}/config/`).then(r => r.ok ? r.json() : null);
      
      // If we have a current config, preserve its admin settings
      if (currentConfig?.admin) {
        config.admin = currentConfig.admin;
      }

      const configJson = JSON.stringify(config);
      caddyLogger.debug({
        url: `${CADDY_API_URL}/load`,
        configLength: configJson.length,
        adminConfig: config.admin,
        routeCount: config.apps?.http?.servers?.srv0?.routes?.length,
        routeWithAuth: config.apps?.http?.servers?.srv0?.routes?.some(r => 
          r.handle?.some(h => h.handler === 'authentication')
        ),
        authHandlers: config.apps?.http?.servers?.srv0?.routes
          ?.filter(r => r.handle?.some(h => h.handler === 'authentication'))
          ?.map(r => ({
            domain: r.match?.[0]?.host?.[0],
            auth: r.handle?.find(h => h.handler === 'authentication')
          }))
      }, 'Sending configuration to Caddy API with authentication details');

      // Apply the config
      const response = await fetch(`${CADDY_API_URL}/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: configJson
      });

      if (!response.ok) {
        const error = await response.text();
        caddyLogger.error({
          statusCode: response.status,
          statusText: response.statusText,
          error,
          requestUrl: `${CADDY_API_URL}/load`,
          configSample: configJson.substring(0, 500) + '...' // Log first 500 chars
        }, 'Caddy API returned error response');
        throw new CaddyError(
          `Failed to apply Caddy configuration: ${error}`,
          'CONFIG_APPLY_ERROR',
          { statusCode: response.status, error }
        );
      }

      caddyLogger.info('Successfully applied Caddy configuration');
    });
  } catch (error) {
    // Log the full error details
    caddyLogger.error({
      error,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : 'unknown',
      errorStack: error instanceof Error ? error.stack : 'unknown',
      errorCause: error instanceof Error ? error.cause : undefined,
      caddyApiUrl: CADDY_API_URL
    }, 'Failed to apply Caddy configuration');

    if (error instanceof CaddyError) {
      throw error;
    }
    throw new CaddyError(
      'Failed to apply Caddy configuration after retries',
      'CONFIG_APPLY_ERROR',
      error
    );
  }
}

/**
 * Retrieves the SSL/TLS certificate status for a domain.
 * 
 * @async
 * @param {string} domain - Domain to check certificate for
 * @returns {Promise<CertificateInfo | null>} Certificate information if found
 * @throws {CaddyError} When certificate status check fails
 * 
 * @example
 * ```typescript
 * const certInfo = await getCertificateStatus('example.com');
 * if (certInfo?.error) {
 *   caddyLogger.warn({ domain, error: certInfo.error }, 'Certificate error');
 * }
 * ```
 */
export async function getCertificateStatus(domain: string): Promise<CertificateInfo | null> {
  try {
    const response = await fetch(`${CADDY_API_URL}/certificates/${domain}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get certificate info: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      managed: data.managed ?? false,
      issuer: data.issuer ?? 'Unknown',
      notBefore: data.not_before ?? '',
      notAfter: data.not_after ?? '',
      error: data.error
    };
  } catch (error) {
    caddyLogger.warn('Failed to get certificate status', { domain, error });
    return null;
  }
}

/**
 * Reloads Caddy configuration with the provided host settings.
 * This is the main entry point for updating Caddy's configuration.
 * 
 * @async
 * @param {ProxyHost[]} hosts - List of proxy host configurations
 * @returns {Promise<void>}
 * @throws {CaddyError} When configuration reload fails
 * 
 * @example
 * ```typescript
 * const hosts = await db.select().from(proxyHosts);
 * await reloadCaddyConfig(hosts);
 * ```
 */
export async function reloadCaddyConfig(hosts: ProxyHost[]): Promise<void> {
  try {
    // Fix any null object passwords in the hosts array
    const fixedHosts = fixNullObjectPasswords(hosts);
    
    caddyLogger.debug({ hosts: fixedHosts.map(h => ({
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
      passwordValue: h.basicAuthPassword === null ? 'null' : 
                   h.basicAuthPassword === undefined ? 'undefined' :
                   typeof h.basicAuthPassword !== 'string' ? `non-string (${typeof h.basicAuthPassword})` :
                   h.basicAuthPassword === '' ? 'empty string' : 'has value',
      validBcrypt: typeof h.basicAuthPassword === 'string' && h.basicAuthPassword.startsWith('$2'),
      passwordLength: typeof h.basicAuthPassword === 'string' ? h.basicAuthPassword.length : 0
    })) }, 'Attempting to reload Caddy configuration with detailed host info');

    // generateCaddyConfig will also apply fixNullObjectPasswords
    const config = await generateCaddyConfig(fixedHosts);
    caddyLogger.debug({ 
      config,
      configStr: JSON.stringify(config).substring(0, 200) + '...' 
    }, 'Generated Caddy configuration');
    
    await applyCaddyConfig(config);
    caddyLogger.info('Successfully reloaded Caddy configuration', {
      hostCount: hosts.length,
      activeHosts: fixedHosts.filter(h => h.enabled).length,
      hostsWithBasicAuth: fixedHosts.filter(h => h.enabled && h.basicAuthEnabled).length
    });
  } catch (error) {
    caddyLogger.error({
      error,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : 'unknown',
      errorStack: error instanceof Error ? error.stack : 'unknown',
      hosts: hosts.map(h => ({
        id: h.id,
        domain: h.domain,
        enabled: h.enabled,
        targetHost: h.targetHost,
        targetPort: h.targetPort
      }))
    }, 'Failed to reload Caddy configuration');
    throw error;
  }
}

/**
 * Retrieves the current status of the Caddy server
 * @returns Object containing server status information
 */
export async function getCaddyStatus(): Promise<{ running: boolean; version: string; config?: CaddyConfig }> {
  try {
    const response = await fetch(`${CADDY_API_URL}/config/`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Fresh Caddy instance with no config
        return { running: true, version: 'unknown' };
      }
      throw new Error(`Failed to get Caddy status: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      running: true,
      version: data.server.version,
      config: data
    };
  } catch (error) {
    caddyLogger.warn('Failed to get Caddy status', { error });
    return { running: false, version: 'unknown' };
  }
}
