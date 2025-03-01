/**
 * Caddy Server Configuration Management
 * 
 * This module handles the generation and management of Caddy server configurations.
 * It provides a type-safe interface for creating and applying Caddy configurations,
 * with support for:
 * 
 * - Reverse proxy configuration
 * - SSL/TLS management
 * - Basic authentication
 * - HTTP/2 support
 * - Advanced custom configurations
 * - Automatic retries with exponential backoff
 * 
 * @module caddy/config
 */

import { proxyHosts } from '../db/schema';
import type { InferModel } from 'drizzle-orm';
import { caddyLogger } from '../logger';
import { generateCaddyHash } from '../auth/password';

// Get Caddy API URL from environment variable, fallback to localhost for development
const CADDY_API_URL = process.env.CADDY_API_URL || 'http://localhost:2019';

// Retry configuration
const MAX_RETRIES = 3;  // Increased from 2
const INITIAL_RETRY_DELAY = 1000;  // Increased from 500ms
const MAX_RETRY_DELAY = 5000;  // Increased from 2000ms

type ProxyHost = InferModel<typeof proxyHosts>;

// Helper function to base64 encode strings
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

// Helper function to bcrypt hash a password
function bcryptHash(password: string): string {
  // This is the format Caddy expects for bcrypt hashes
  // The format should be $2a$14$ followed by 22 characters of salt and 31 characters of hash
  return `$2a$14$${base64Encode(password)}`;
}

/**
 * Represents a Caddy route configuration.
 * Routes define how Caddy handles incoming requests based on matching criteria.
 * 
 * @see https://caddyserver.com/docs/json/apps/http/servers/routes/
 */
interface CaddyMatch {
  host: string[];
  protocol?: string;
  path?: string[];
}

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
 * Provides additional context about what went wrong during Caddy operations.
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
 * Generates a complete Caddy server configuration from a list of enabled proxy hosts.
 * 
 * This function:
 * - Creates routes for each enabled host
 * - Configures SSL/TLS settings per host
 * - Sets up basic authentication if enabled
 * - Applies advanced configurations
 * - Handles HTTP/2 support
 * 
 * @param hosts - List of enabled proxy host configurations
 * @returns Complete Caddy configuration object
 * @throws Error if configuration generation fails
 */
export async function generateCaddyConfig(hosts: ProxyHost[]): Promise<any> {
  const routes: any[] = [];

  for (const host of hosts) {
    if (!host.enabled) continue;

    const route: any = {
      match: [{
        host: [host.domain]
      }],
      handle: []
    };

    // Add basic auth if configured
    if (host.basicAuthEnabled && host.basicAuthUsername && host.basicAuthPassword) {
      const hashedPassword = await generateCaddyHash(host.basicAuthPassword);
      route.handle.push({
        handler: "authentication",
        providers: {
          http_basic: {
            accounts: [{
              username: host.basicAuthUsername,
              password: hashedPassword
            }],
            realm: "Restricted"
          }
        }
      });
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
        protocol: host.targetProtocol,
        ...(host.targetProtocol === 'https' && {
          tls: {
            insecure_skip_verify: host.ignoreInvalidCert || false
          }
        })
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
 * Applies a configuration to the running Caddy server
 * @param config - The configuration to apply
 * @throws {CaddyError} If configuration application fails
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
        adminConfig: config.admin
      }, 'Sending configuration to Caddy API');

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
 * Reloads the Caddy configuration with the current proxy host settings
 * @param hosts - Array of proxy host configurations
 * @throws {CaddyError} If configuration reload fails
 */
export async function reloadCaddyConfig(hosts: ProxyHost[]): Promise<void> {
  try {
    caddyLogger.debug({ hosts: hosts.map(h => ({
      id: h.id,
      domain: h.domain,
      enabled: h.enabled,
      targetHost: h.targetHost,
      targetPort: h.targetPort
    })) }, 'Attempting to reload Caddy configuration');

    const config = await generateCaddyConfig(hosts);
    caddyLogger.debug({ config }, 'Generated Caddy configuration');
    
    await applyCaddyConfig(config);
    caddyLogger.info('Successfully reloaded Caddy configuration', {
      hostCount: hosts.length,
      activeHosts: hosts.filter(h => h.enabled).length
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
      throw new Error(`Failed to get Caddy config: ${response.statusText}`);
    }

    const config = await response.json();
    return { 
      running: true, 
      version: 'unknown',
      config: config === null ? undefined : config
    };
  } catch (error) {
    // Any error reaching the Caddy API means Caddy is not running
    caddyLogger.error('Failed to connect to Caddy admin API', { error });
    return { running: false, version: 'unknown' };
  }
}

/**
 * Retrieves certificate information for a domain
 * @param domain - The domain to check
 * @returns Certificate information or null if not found
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