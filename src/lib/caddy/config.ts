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
interface CaddyRoute {
  match: { host: string[] }[];
  handle: (
    | {
        handler: 'reverse_proxy';
        upstreams: { dial: string }[];
        transport?: {
          protocol: string;
          tls?: Record<string, never>;
        };
      }
    | {
        handler: 'authentication';
        providers: {
          http_basic: {
            hash: {
              algorithm: string;
            };
            accounts: {
              username: string;
              password: string;
              salt: string;
            }[];
          };
        };
      }
  )[];
  terminal: boolean;
}

/**
 * Represents a Caddy server configuration.
 * Servers define how Caddy listens for incoming connections.
 * 
 * @see https://caddyserver.com/docs/json/apps/http/servers/
 */
interface CaddyServer {
  listen: string[];
  routes: CaddyRoute[];
  automatic_https?: {
    disable?: boolean;
  };
}

/**
 * Top-level Caddy configuration.
 * This is the root configuration object that gets sent to Caddy's API.
 * 
 * @see https://caddyserver.com/docs/json/
 */
interface CaddyConfig {
  admin: {
    listen: string;
    disabled?: boolean;
  };
  apps: {
    http: {
      servers: {
        [key: string]: CaddyServer;
      };
    };
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
 * - Configures SSL/TLS settings
 * - Sets up basic authentication if enabled
 * - Applies advanced configurations
 * - Handles HTTP/2 support
 * 
 * @param enabledHosts - List of enabled proxy host configurations
 * @returns Complete Caddy configuration object
 * @throws Error if configuration generation fails
 */
export function generateCaddyConfig(enabledHosts: ProxyHost[]): CaddyConfig {
  caddyLogger.info({ hostCount: enabledHosts.length }, 'Generating Caddy configuration');
  
  try {
    const config: CaddyConfig = {
      admin: {
        listen: '0.0.0.0:2019',
        disabled: false
      },
      apps: {
        http: {
          servers: {
            srv0: {
              listen: [":80", ":443"],
              routes: enabledHosts.map(host => {
                caddyLogger.debug({ host: host.domain }, 'Configuring host');
                
                const route: any = {
                  match: [{ host: [host.domain] }],
                  handle: []
                };

                // Add basic auth if enabled
                if (host.basicAuthEnabled && host.basicAuthUsername && host.basicAuthPassword) {
                  caddyLogger.debug({ host: host.domain }, 'Configuring basic auth');
                  route.handle.push({
                    handler: "authentication",
                    providers: {
                      http_basic: {
                        accounts: [{
                          username: host.basicAuthUsername,
                          password: host.basicAuthPassword
                        }]
                      }
                    }
                  });
                }

                // Add reverse proxy configuration
                route.handle.push({
                  handler: "reverse_proxy",
                  upstreams: [{ dial: `${host.targetHost}:${host.targetPort}` }]
                });

                // Add SSL configuration if enabled
                if (host.sslEnabled) {
                  caddyLogger.debug({ host: host.domain }, 'Configuring SSL');
                  route.handle.push({
                    handler: "tls",
                    alpn: ["h2", "http/1.1"],
                    ...(host.http2Support ? { protocols: ["h2", "http/1.1"] } : {})
                  });
                }

                // Add advanced configuration if provided
                if (host.advancedConfig) {
                  caddyLogger.debug({ host: host.domain }, 'Adding advanced configuration');
                  try {
                    const advancedConfig = JSON.parse(host.advancedConfig);
                    Object.assign(route, advancedConfig);
                  } catch (error) {
                    caddyLogger.error(
                      { error, host: host.domain },
                      'Failed to parse advanced configuration'
                    );
                  }
                }

                return route;
              })
            }
          }
        }
      }
    };

    caddyLogger.info('Caddy configuration generated successfully');
    return config;
  } catch (error) {
    caddyLogger.error({ error }, 'Failed to generate Caddy configuration');
    throw error;
  }
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
    if (error instanceof Error && 'code' in error && error.code === 'ECONNREFUSED') {
      caddyLogger.error('Failed to connect to Caddy admin API', { error });
      return { running: false, version: 'unknown' };
    }

    // For other errors, assume Caddy is running but having temporary issues
    caddyLogger.warn('Error getting Caddy status, but server appears to be running', { error });
    return { running: true, version: 'unknown' };
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