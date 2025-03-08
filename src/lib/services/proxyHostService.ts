/**
 * Service for proxy host management.
 * Handles business logic for proxy hosts, including configuration with Caddy.
 * @module services/proxyHostService
 */
import { proxyHostRepository } from '$lib/repositories/proxyHostRepository'
import { createAuditLog } from '$lib/db/audit'
import { reloadCaddyConfig, getCaddyStatus, getCertificateStatus } from '$lib/caddy/config'
import { apiLogger } from '$lib/utils/logger'
import { generateCaddyHash } from '$lib/auth/password'
import type {
  ProxyHost,
  ProxyHostWithCert,
  CreateProxyHostData,
  CaddyStatus
} from '$lib/models/proxyHost'

/**
 * Gets all proxy hosts with certificate information
 *
 * @returns {Promise<ProxyHostWithCert[]>} Proxy hosts with certificate status
 */
export async function getAllProxyHosts(): Promise<ProxyHostWithCert[]> {
  const hosts = await proxyHostRepository.getAll()

  apiLogger.debug(
    {
      hosts: hosts.map((h) => ({
        id: h.id,
        domain: h.domain,
        sslEnabled: h.sslEnabled
      }))
    },
    'Retrieved hosts from database'
  )

  // Enhance each host with certificate information if SSL is enabled
  const hostsWithCerts = await Promise.all(
    hosts.map(async (host) => {
      if (host.sslEnabled) {
        const certStatus = await getCertificateStatus(host.domain)
        return {
          ...host,
          certStatus
        }
      }
      return {
        ...host,
        certStatus: null
      }
    })
  )

  return hostsWithCerts
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
    const certStatus = await getCertificateStatus(host.domain)
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
  // Handle password hashing if basic auth is enabled
  if (hostData.basicAuthEnabled && hostData.basicAuthPassword) {
    const basicAuthHash = await generateCaddyHash(hostData.basicAuthPassword)
    hostData = {
      ...hostData,
      basicAuthHash,
      basicAuthPassword: ''
    }
  }

  // Ensure all optional fields are properly defined for repository create method
  const hostDataForRepository: Omit<ProxyHost, 'id' | 'createdAt' | 'updatedAt'> = {
    domain: hostData.domain,
    targetHost: hostData.targetHost,
    targetPort: hostData.targetPort,
    targetProtocol: hostData.targetProtocol,
    sslEnabled: hostData.sslEnabled,
    forceSSL: hostData.forceSSL,
    http2Support: hostData.http2Support,
    http3Support: hostData.http3Support,
    enabled: hostData.enabled,
    cacheEnabled: hostData.cacheEnabled,
    advancedConfig: hostData.advancedConfig ?? null,
    basicAuthEnabled: hostData.basicAuthEnabled,
    basicAuthUsername: hostData.basicAuthUsername ?? null,
    basicAuthPassword: hostData.basicAuthPassword ?? null,
    basicAuthHash: hostData.basicAuthHash ?? null,
    ignoreInvalidCert: hostData.ignoreInvalidCert
  }

  const createdHost = await proxyHostRepository.create(hostDataForRepository)

  // Create audit log entry
  await createAuditLog({
    actionType: 'create',
    entityType: 'proxy_host',
    entityId: createdHost.id,
    userId,
    changes: {
      domain: createdHost.domain,
      targetHost: createdHost.targetHost
    }
  })

  // Reload Caddy configuration
  const allHosts = await proxyHostRepository.getAll()
  await reloadCaddyConfig(allHosts)

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

  // Handle password hashing if basic auth is enabled
  let updatedData = { ...hostData }
  if (updatedData.basicAuthEnabled && updatedData.basicAuthPassword) {
    const basicAuthHash = await generateCaddyHash(updatedData.basicAuthPassword)
    updatedData = {
      ...updatedData,
      basicAuthHash,
      basicAuthPassword: ''
    }
  }

  const updatedHost = await proxyHostRepository.update(id.toString(), updatedData)

  // Create audit log entry with appropriate information
  const changes: Record<string, any> = {}

  // Only include changes that were actually changed from previous values
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

  // Special handling for status toggle
  if (hostData.enabled !== undefined && hostData.enabled !== existingHost.enabled) {
    changes.status = {
      from: existingHost.enabled ? 'active' : 'disabled',
      to: hostData.enabled ? 'active' : 'disabled'
    }
  }

  // Only create an audit log if there were actual changes
  if (Object.keys(changes).length > 0) {
    await createAuditLog({
      actionType: 'update',
      entityType: 'proxy_host',
      entityId: id,
      userId,
      changes
    })
  }

  // Reload Caddy configuration
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
    // Create audit log entry
    await createAuditLog({
      actionType: 'delete',
      entityType: 'proxy_host',
      entityId: id,
      userId,
      changes: {
        domain: existingHost.domain
      }
    })

    // Reload Caddy configuration
    const allHosts = await proxyHostRepository.getAll()
    await reloadCaddyConfig(allHosts)
  }

  return deleted
}

/**
 * Gets the current Caddy server status
 *
 * @returns {Promise<CaddyStatus>} Caddy server status
 */
export async function getCaddyServerStatus(): Promise<CaddyStatus> {
  return await getCaddyStatus()
}
