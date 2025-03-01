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

// Get Caddy API URL from environment variable, fallback to localhost for development
const CADDY_API_URL = process.env.CADDY_API_URL || 'http://localhost:2019';

// Retry configuration
const MAX_RETRIES = 2; // Reduced from 3
const INITIAL_RETRY_DELAY = 500; // Reduced from 1000ms to 500ms
const MAX_RETRY_DELAY = 2000; // Cap the maximum retry delay

type ProxyHost = InferModel<typeof proxyHosts>;

/**
 * Represents a Caddy route configuration.
 * Routes define how Caddy handles incoming requests based on matching criteria.
 * 
 * @see https://caddyserver.com/docs/json/apps/http/servers/routes/
 */
interface CaddyMatch {
  host: string[];
  protocol?: string;
}

interface CaddyHandler {
  handler: "reverse_proxy" | "authentication" | "static_response";
  upstreams?: { dial: string }[];
  providers?: {
    http_basic: {
      accounts: { username: string; password: string }[];
    };
  };
  status_code?: number;
  headers?: {
    Location: string[];
  };
  transport?: {
    protocol: string;
    tls?: {
      insecure_skip_verify?: boolean;
    };
  };
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
export function generateCaddyConfig(hosts: ProxyHost[]): CaddyConfig {
  const enabledHosts = hosts.filter((host) => host.enabled);
  const routes: CaddyRoute[] = [];

  for (const host of enabledHosts) {
    // Clean the target host by removing any protocol prefixes and slashes
    const cleanTargetHost = host.targetHost
      .replace(/^https?:\/\//, '')  // Remove any protocol prefix
      .replace(/^\/+|\/+$/g, '')    // Remove leading and trailing slashes
      .trim();                      // Remove any whitespace
    
    // For the dial field, just use host:port without protocol
    const dialAddress = `${cleanTargetHost}:${host.targetPort}`;

    // Configure the handler with proper transport settings
    const proxyHandler: CaddyHandler = {
      handler: "reverse_proxy",
      upstreams: [{ dial: dialAddress }]
    };

    // Add TLS transport config for HTTPS upstream
    if (host.targetProtocol === 'https') {
      proxyHandler.transport = {
        protocol: "http",
        tls: {
          ...(host.ignoreInvalidCert && { insecure_skip_verify: true })
        }
      };
    }

    if (host.sslEnabled) {
      // SSL-enabled host configuration
      const httpsRoute: CaddyRoute = {
        match: [
          {
            host: [host.domain],
            protocol: "https",
          },
        ],
        handle: [proxyHandler],
      };

      // Add basic auth if enabled
      if (host.basicAuthEnabled && host.basicAuthUsername && host.basicAuthPassword) {
        httpsRoute.handle.unshift({
          handler: "authentication",
          providers: {
            http_basic: {
              accounts: [
                {
                  username: host.basicAuthUsername,
                  password: host.basicAuthPassword,
                },
              ],
            },
          },
        });
      }

      routes.push(httpsRoute);

      // Add HTTP to HTTPS redirect if forceSSL is enabled
      if (host.forceSSL) {
        routes.push({
          match: [
            {
              host: [host.domain],
              protocol: "http",
            },
          ],
          handle: [
            {
              handler: "static_response",
              status_code: 308,
              headers: {
                Location: [
                  `https://{http.request.host}{http.request.uri}`,
                ],
              },
            },
          ],
        });
      }
    } else {
      // Non-SSL host configuration with explicit TLS disable
      const httpRoute: CaddyRoute = {
        match: [
          {
            host: [host.domain],
          },
        ],
        handle: [proxyHandler],
        terminal: true,
      };

      // Add basic auth if enabled
      if (host.basicAuthEnabled && host.basicAuthUsername && host.basicAuthPassword) {
        httpRoute.handle.unshift({
          handler: "authentication",
          providers: {
            http_basic: {
              accounts: [
                {
                  username: host.basicAuthUsername,
                  password: host.basicAuthPassword,
                },
              ],
            },
          },
        });
      }

      routes.push(httpRoute);
    }
  }

  // Only include TLS configuration for SSL-enabled hosts
  const sslHosts = enabledHosts.filter((host) => host.sslEnabled);

  return {
    admin: {
      listen: "0.0.0.0:2019",
      disabled: false,
    },
    logging: {
      logs: {
        default: {
          level: "INFO",
        },
      },
    },
    apps: {
      http: {
        servers: {
          srv0: {
            listen: [":80", ":443"],
            routes: routes,
            automatic_https: {
              disable: true, // Disable automatic HTTPS globally
            },
            ...(sslHosts.length > 0 && {
              tls_connection_policies: sslHosts.map(host => ({
                match: {
                  sni: [host.domain],
                },
                protocol_min: "1.2",
                protocol_max: "1.3",
                alpn: [
                  ...(host.http2Support ? ["h2"] : []),
                  ...(host.http3Support ? ["h3"] : []),
                  "http/1.1"
                ],
              })),
            }),
          },
        },
      },
      ...(sslHosts.length > 0 && {
        tls: {
          automation: {
            policies: [{
              subjects: sslHosts.map(host => host.domain),
              issuers: [{
                module: "acme",
                challenges: {
                  http: {
                    alternate_port: 80,
                  },
                },
              }],
            }],
          },
        },
      }),
    },
  };
}

/**
 * Applies a configuration to the running Caddy server
 * @param config - The configuration to apply
 * @throws {CaddyError} If configuration application fails
 */
export async function applyCaddyConfig(config: CaddyConfig): Promise<void> {
  try {
    await retryWithBackoff(async () => {
      caddyLogger.debug('Sending configuration to Caddy API');
      const response = await fetch(`${CADDY_API_URL}/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.text();
        caddyLogger.error({
          statusCode: response.status,
          statusText: response.statusText,
          error
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
      errorCause: error instanceof Error ? error.cause : undefined
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
    const config = generateCaddyConfig(hosts);
    await applyCaddyConfig(config);
    caddyLogger.info('Successfully reloaded Caddy configuration', {
      hostCount: hosts.length,
      activeHosts: hosts.filter(h => h.enabled).length
    });
  } catch (error) {
    caddyLogger.error('Failed to reload Caddy configuration', { error });
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