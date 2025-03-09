/**
 * Service for proxy host management.
 * Handles business logic for proxy hosts, including configuration with Caddy.
 * @module services/proxyHostService
 */
import { proxyHostRepository } from '$lib/repositories/proxyHostRepository'
import { createAuditLog } from '$lib/db/audit'
import {
  reloadCaddyConfig,
  getCaddyServerStatus as getCaddyStatus,
  getCertificateStatus
} from '$lib/caddy/config'
import { apiLogger } from '$lib/utils/logger'
import { generateCaddyHash } from '$lib/auth/password'
import { batchProcess, withRetry } from '$lib/utils/db'
import type {
  ProxyHost,
  ProxyHostWithCert,
  CreateProxyHostData,
  CaddyStatus,
  CertificateInfo
} from '$lib/models/proxyHost'

/**
 * Gets certificate status directly without caching
 *
 * @param {string} domain - Domain to get certificate for
 * @returns {Promise<CertificateInfo | null>} Certificate status
 */
async function getCertificateStatusDirect(domain: string): Promise<CertificateInfo | null> {
  return await getCertificateStatus(domain)
}

/**
 * Gets all proxy hosts with certificate information
 *
 * @param {boolean} [loadCertificates=true] - Whether to load certificate information
 * @returns {Promise<ProxyHostWithCert[]>} Proxy hosts with certificate status
 */
export async function getAllProxyHosts(
  loadCertificates: boolean = true
): Promise<ProxyHostWithCert[]> {
  const hosts = await proxyHostRepository.getAll()

  apiLogger.debug(
    {
      hostsCount: hosts.length,
      sslEnabled: hosts.filter((h) => h.sslEnabled).length
    },
    'Retrieved hosts from database'
  )

  const sslHosts = hosts.filter((h) => h.sslEnabled)
  const nonSslHosts = hosts.filter((h) => !h.sslEnabled)

  if (!loadCertificates) {
    return [...sslHosts, ...nonSslHosts].map((host) => ({
      ...host,
      certStatus: null
    }))
  }

  const sslHostsWithCerts = await batchProcess(
    sslHosts,
    async (host) => {
      const certStatus = await getCertificateStatusDirect(host.domain)
      return {
        ...host,
        certStatus
      }
    },
    50
  )

  const nonSslHostsWithCerts = nonSslHosts.map((host) => ({
    ...host,
    certStatus: null
  }))

  return [...sslHostsWithCerts, ...nonSslHostsWithCerts]
}

/**
 * Gets a proxy host by ID with certificate information
 *
 * @param {number} id - The proxy host ID
 * @returns {Promise<ProxyHostWithCert|null>} The proxy host with certificate status or null if not found
 */
export async function getProxyHostById(id: number): Promise<ProxyHostWithCert | null> {
  const host = await proxyHostRepository.getById(id.toString())
  if (!host) return null

  if (host.sslEnabled) {
    const certStatus = await getCertificateStatusDirect(host.domain)
    return {
      ...host,
      certStatus
    }
  }

  return {
    ...host,
    certStatus: null
  }
}

/**
 * Creates a new proxy host and updates Caddy configuration
 *
 * @param {CreateProxyHostData} hostData - The proxy host data
 * @param {number} userId - User ID for audit logging
 * @returns {Promise<ProxyHost>} The created proxy host
 */
export async function createProxyHost(
  hostData: CreateProxyHostData,
  userId: number
): Promise<ProxyHost> {
  let basicAuthHash: string | null = null
  if (hostData.basicAuthEnabled && hostData.basicAuthPassword) {
    basicAuthHash = await generateCaddyHash(hostData.basicAuthPassword)
    apiLogger.debug('Generated bcrypt hash for basic auth password', {
      hasHash: !!basicAuthHash,
      hashFormat: basicAuthHash?.substring(0, 6) + '...'
    })
  }

  const createdHost = await withRetry(async () => {
    const hostForRepository: Omit<ProxyHost, 'id' | 'createdAt' | 'updatedAt'> = {
      domain: hostData.domain,
      targetHost: hostData.targetHost,
      targetPort: hostData.targetPort,
      targetProtocol: hostData.targetProtocol,
      sslEnabled: hostData.sslEnabled,
      forceSSL: hostData.forceSSL,
      http2Support: hostData.http2Support,
      http3Support: hostData.http3Support,
      enabled: hostData.enabled,
      cacheEnabled: hostData.cacheEnabled ?? false,
      ignoreInvalidCert: hostData.ignoreInvalidCert,
      advancedConfig: hostData.advancedConfig || null,
      basicAuthEnabled: hostData.basicAuthEnabled,
      basicAuthUsername: hostData.basicAuthUsername || null,
      basicAuthPassword: null,
      basicAuthHash: basicAuthHash
    }

    const host = await proxyHostRepository.create(hostForRepository)

    try {
      await createAuditLog({
        actionType: 'create',
        entityType: 'proxyHost',
        entityId: host.id,
        userId,
        changes: {
          domain: host.domain,
          targetHost: host.targetHost,
          targetPort: host.targetPort,
          enabled: host.enabled,
          basicAuthEnabled: host.basicAuthEnabled,
          sslEnabled: host.sslEnabled,
          forceSSL: host.forceSSL,
          http2Support: host.http2Support,
          http3Support: host.http3Support,
          cacheEnabled: host.cacheEnabled,
          ignoreInvalidCert: host.ignoreInvalidCert
        }
      })
    } catch (auditError) {
      apiLogger.error({ error: auditError }, 'Failed to create audit log for proxy host creation')
    }

    return host
  })

  try {
    const allHosts = await proxyHostRepository.getAll()
    await reloadCaddyConfig(allHosts)
  } catch (caddyError) {
    apiLogger.error(
      { error: caddyError, hostId: createdHost.id, domain: createdHost.domain },
      'Failed to reload Caddy config after host creation'
    )
  }

  return createdHost
}

/**
 * Updates a proxy host and reloads Caddy configuration
 *
 * @param {number} id - The proxy host ID
 * @param {Partial<CreateProxyHostData>} hostData - The updated proxy host data
 * @param {number} userId - User ID for audit logging
 * @returns {Promise<ProxyHost|null>} The updated proxy host or null if not found
 */
export async function updateProxyHost(
  id: number,
  hostData: Partial<CreateProxyHostData>,
  userId: number
): Promise<ProxyHost | null> {
  const existingHost = await proxyHostRepository.getById(id.toString())
  if (!existingHost) return null

  let updatedData = { ...hostData }

  if (updatedData.basicAuthEnabled && updatedData.basicAuthPassword) {
    const basicAuthHash = await generateCaddyHash(updatedData.basicAuthPassword)
    apiLogger.debug('Generated bcrypt hash for updated basic auth password', {
      hostId: id,
      hasHash: !!basicAuthHash,
      hashFormat: basicAuthHash?.substring(0, 6) + '...'
    })

    updatedData = {
      ...updatedData,
      basicAuthHash,
      basicAuthPassword: null
    }
  } else if (updatedData.basicAuthEnabled === false) {
    updatedData = {
      ...updatedData,
      basicAuthUsername: null,
      basicAuthPassword: null,
      basicAuthHash: null
    }
  }

  const updatedHost = await proxyHostRepository.update(id.toString(), updatedData)

  const changes: Record<string, unknown> = {}

  if (hostData.domain && hostData.domain !== existingHost.domain) {
    changes.domain = {
      from: existingHost.domain,
      to: hostData.domain
    }
  }

  if (hostData.targetHost && hostData.targetHost !== existingHost.targetHost) {
    changes.targetHost = {
      from: existingHost.targetHost,
      to: hostData.targetHost
    }
  }

  if (hostData.enabled !== undefined && hostData.enabled !== existingHost.enabled) {
    changes.status = {
      from: existingHost.enabled ? 'active' : 'disabled',
      to: hostData.enabled ? 'active' : 'disabled'
    }
  }

  if (
    hostData.basicAuthEnabled !== undefined &&
    hostData.basicAuthEnabled !== existingHost.basicAuthEnabled
  ) {
    changes.basicAuth = {
      from: existingHost.basicAuthEnabled ? 'enabled' : 'disabled',
      to: hostData.basicAuthEnabled ? 'enabled' : 'disabled'
    }
  }

  if (hostData.sslEnabled !== undefined && hostData.sslEnabled !== existingHost.sslEnabled) {
    changes.ssl = {
      from: existingHost.sslEnabled ? 'enabled' : 'disabled',
      to: hostData.sslEnabled ? 'enabled' : 'disabled'
    }
  }

  if (hostData.forceSSL !== undefined && hostData.forceSSL !== existingHost.forceSSL) {
    changes.forceSSL = {
      from: existingHost.forceSSL ? 'enabled' : 'disabled',
      to: hostData.forceSSL ? 'enabled' : 'disabled'
    }
  }

  if (hostData.http2Support !== undefined && hostData.http2Support !== existingHost.http2Support) {
    changes.http2Support = {
      from: existingHost.http2Support ? 'enabled' : 'disabled',
      to: hostData.http2Support ? 'enabled' : 'disabled'
    }
  }

  if (hostData.http3Support !== undefined && hostData.http3Support !== existingHost.http3Support) {
    changes.http3Support = {
      from: existingHost.http3Support ? 'enabled' : 'disabled',
      to: hostData.http3Support ? 'enabled' : 'disabled'
    }
  }

  if (hostData.cacheEnabled !== undefined && hostData.cacheEnabled !== existingHost.cacheEnabled) {
    changes.cache = {
      from: existingHost.cacheEnabled ? 'enabled' : 'disabled',
      to: hostData.cacheEnabled ? 'enabled' : 'disabled'
    }
  }

  if (
    hostData.ignoreInvalidCert !== undefined &&
    hostData.ignoreInvalidCert !== existingHost.ignoreInvalidCert
  ) {
    changes.ignoreInvalidCert = {
      from: existingHost.ignoreInvalidCert ? 'enabled' : 'disabled',
      to: hostData.ignoreInvalidCert ? 'enabled' : 'disabled'
    }
  }

  if (Object.keys(changes).length > 0) {
    if (!changes.domain) {
      changes.domain = existingHost.domain
    }

    await createAuditLog({
      actionType: 'update',
      entityType: 'proxy_host',
      entityId: id,
      userId,
      changes
    })
  }

  const allHosts = await proxyHostRepository.getAll()
  await reloadCaddyConfig(allHosts)

  return updatedHost || null
}

/**
 * Deletes a proxy host and updates Caddy configuration
 *
 * @param {number} id - The proxy host ID
 * @param {number} userId - User ID for audit logging
 * @returns {Promise<boolean>} True if the host was deleted
 */
export async function deleteProxyHost(id: number, userId: number): Promise<boolean> {
  const existingHost = await proxyHostRepository.getById(id.toString())
  if (!existingHost) return false

  const deleted = await proxyHostRepository.delete(id.toString())

  if (deleted) {
    await createAuditLog({
      actionType: 'delete',
      entityType: 'proxy_host',
      entityId: id,
      userId,
      changes: {
        domain: existingHost.domain
      }
    })

    const allHosts = await proxyHostRepository.getAll()
    await reloadCaddyConfig(allHosts)
  }

  return deleted
}

/**
 * Gets the Caddy server status
 *
 * @returns {Promise<CaddyStatus>} Caddy server status
 */
export async function getCaddyServerStatus(): Promise<CaddyStatus> {
  return await getCaddyStatus()
}
