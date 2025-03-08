/**
 * Type definitions for proxy host data.
 * @module models/proxyHost
 */

/**
 * Represents a proxy host configuration
 */
export interface ProxyHost {
  id: number
  createdAt: Date | null
  updatedAt: Date | null
  domain: string
  targetHost: string
  targetPort: number
  targetProtocol: string
  sslEnabled: boolean
  forceSSL: boolean
  http2Support: boolean
  http3Support: boolean
  enabled: boolean
  cacheEnabled: boolean
  advancedConfig: string | null
  basicAuthEnabled: boolean
  basicAuthUsername: string | null
  basicAuthPassword: string | null
  basicAuthHash: string | null
  ignoreInvalidCert: boolean
}

/**
 * Represents certificate information returned by Caddy
 */
export interface CertificateInfo {
  domain?: string
  isValid?: boolean
  expiry?: Date | null
  issuer?: string | null
  daysRemaining?: number | null
  error?: string | null
}

/**
 * Represents a proxy host with certificate status information
 */
export interface ProxyHostWithCert extends ProxyHost {
  certStatus: CertificateInfo | null
}

/**
 * Represents data needed to create a proxy host
 */
export interface CreateProxyHostData {
  domain: string
  targetHost: string
  targetPort: number
  targetProtocol: string
  sslEnabled: boolean
  forceSSL: boolean
  http2Support: boolean
  http3Support: boolean
  enabled: boolean
  cacheEnabled: boolean
  advancedConfig?: string | null
  basicAuthEnabled: boolean
  basicAuthUsername?: string | null
  basicAuthPassword?: string | null
  basicAuthHash?: string | null
  ignoreInvalidCert: boolean
}

/**
 * Represents Caddy server status information
 */
export interface CaddyStatus {
  running: boolean
  version?: string
  uptime?: string
  error?: string
}
