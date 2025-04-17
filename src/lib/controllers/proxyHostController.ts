/**
 * Controller for proxy host API routes.
 * Handles HTTP requests for proxy host operations.
 * @module controllers/proxyHostController
 */
import * as proxyHostService from '$lib/services/proxyHostService'
import { fail } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { apiLogger } from '$lib/utils/logger'

interface ExtendedRequestEvent extends RequestEvent {
  depends: (dep: string) => void
}

/**
 * Loads all proxy hosts with certificate information
 *
 * @param {Object} event - The request event
 * @returns {Promise<Object>} Proxy hosts and Caddy status
 */
export async function loadProxyHosts(event: ExtendedRequestEvent) {
  const { depends } = event

  depends('app:proxy-hosts')
  depends('app:caddy-status')

  const [hosts, caddyStatus] = await Promise.all([
    proxyHostService.getAllProxyHosts(false),
    proxyHostService.getCaddyServerStatus()
  ])

  return {
    hosts,
    caddyRunning: caddyStatus.running,
    loadingCertificates: hosts.some((host) => host.sslEnabled)
  }
}

/**
 * Creates a new proxy host
 *
 * @param {Object} event - The request event
 * @returns {Promise<Object>} Result of the operation
 */
export async function createProxyHost(event: RequestEvent) {
  const { request, locals } = event
  const formData = await request.formData()

  const domain = formData.get('domain')?.toString() || ''
  const targetHost = formData.get('targetHost')?.toString() || ''
  const targetPort = parseInt(formData.get('targetPort')?.toString() || '80', 10)
  const targetProtocol = formData.get('targetProtocol')?.toString() || 'http'
  const sslEnabled = formData.get('sslEnabled') === 'true'
  const forceSSL = formData.get('forceSSL') === 'true'
  const enabled = formData.get('enabled') === 'true'
  const cacheEnabled = formData.get('cacheEnabled') === 'true'
  const basicAuthEnabled = formData.get('basicAuthEnabled') === 'true'
  const basicAuthUsername = formData.get('basicAuthUsername')?.toString() || ''
  const basicAuthPassword = formData.get('basicAuthPassword')?.toString() || ''

  if (!domain) {
    return fail(400, { error: 'Domain is required' })
  }

  if (!targetHost) {
    return fail(400, { error: 'Target host is required' })
  }

  const hostData = {
    domain,
    targetHost,
    targetPort,
    targetProtocol,
    sslEnabled,
    forceSSL,
    enabled,
    cacheEnabled,
    basicAuthEnabled,
    basicAuthUsername: basicAuthEnabled ? basicAuthUsername : null,
    basicAuthPassword: basicAuthEnabled ? basicAuthPassword : null
  }

  try {
    const userId = locals.user?.id || 0
    const createdHost = await proxyHostService.createProxyHost(
      {
        ...hostData,
        http2Support: false,
        http3Support: false,
        ignoreInvalidCert: false
      },
      userId
    )

    return { success: true, host: createdHost }
  } catch (error) {
    apiLogger.error({ error }, 'Failed to create proxy host')
    return fail(500, { error: 'Failed to create proxy host' })
  }
}

/**
 * Updates an existing proxy host
 *
 * @param {Object} event - The request event
 * @returns {Promise<Object>} Result of the operation
 */
export async function updateProxyHost(event: RequestEvent) {
  const { request, locals, params } = event
  const formData = await request.formData()

  let id = parseInt(params.id || '0', 10)

  if (!id) {
    const formId = formData.get('id')
    id = formId ? parseInt(formId.toString(), 10) : 0
  }

  if (!id) {
    return fail(400, { error: 'Invalid host ID' })
  }

  const domain = formData.get('domain')?.toString() || ''
  const targetHost = formData.get('targetHost')?.toString() || ''
  const targetPort = parseInt(formData.get('targetPort')?.toString() || '80', 10)
  const targetProtocol = formData.get('targetProtocol')?.toString() || 'http'
  const sslEnabled = formData.get('sslEnabled') === 'true'
  const forceSSL = formData.get('forceSSL') === 'true'
  const http2Support = formData.get('http2Support') === 'true'
  const http3Support = formData.get('http3Support') === 'true'
  const enabled = formData.get('enabled') === 'true'
  const cacheEnabled = formData.get('cacheEnabled') === 'true'
  const basicAuthEnabled = formData.get('basicAuthEnabled') === 'true'
  const basicAuthUsername = formData.get('basicAuthUsername')?.toString() || ''
  const basicAuthPassword = formData.get('basicAuthPassword')?.toString() || ''
  const advancedConfig = formData.get('advancedConfig')?.toString() || ''
  const ignoreInvalidCert = formData.get('ignoreInvalidCert') === 'true'

  if (!domain) {
    return fail(400, { error: 'Domain is required' })
  }

  if (!targetHost) {
    return fail(400, { error: 'Target host is required' })
  }

  const hostData = {
    domain,
    targetHost,
    targetPort,
    targetProtocol,
    sslEnabled,
    forceSSL,
    http2Support,
    http3Support,
    enabled,
    cacheEnabled,
    advancedConfig,
    basicAuthEnabled,
    basicAuthUsername: basicAuthEnabled ? basicAuthUsername : null,
    basicAuthPassword: basicAuthEnabled ? basicAuthPassword : null,
    ignoreInvalidCert
  }

  try {
    const userId = locals.user?.id || 0
    const updatedHost = await proxyHostService.updateProxyHost(id, hostData, userId)

    if (!updatedHost) {
      return fail(404, { error: 'Proxy host not found' })
    }

    return { success: true, host: updatedHost }
  } catch (error) {
    apiLogger.error({ error }, 'Failed to update proxy host')
    return fail(500, { error: 'Failed to update proxy host' })
  }
}

/**
 * Deletes a proxy host
 *
 * @param {Object} event - The request event
 * @returns {Promise<Object>} Result of the operation
 */
export async function deleteProxyHost(event: RequestEvent) {
  const { locals, params, request } = event

  let id = parseInt(params.id || '0', 10)

  if (!id) {
    const formData = await request.formData()
    const formId = formData.get('id')
    id = formId ? parseInt(formId.toString(), 10) : 0
  }

  if (!id) {
    return fail(400, { error: 'Invalid host ID' })
  }

  try {
    const userId = locals.user?.id || 0
    const deleted = await proxyHostService.deleteProxyHost(id, userId)

    if (!deleted) {
      return fail(404, { error: 'Proxy host not found' })
    }

    return { success: true }
  } catch (error) {
    apiLogger.error({ error }, 'Failed to delete proxy host')
    return fail(500, { error: 'Failed to delete proxy host' })
  }
}

/**
 * Toggles the enabled status of a proxy host
 *
 * @param {Object} event - The request event
 * @returns {Promise<Object>} Result of the operation
 */
export async function toggleProxyHost(event: RequestEvent) {
  const { locals, request } = event
  const formData = await request.formData()

  const formId = formData.get('id')
  const id = formId ? parseInt(formId.toString(), 10) : 0

  if (!id) {
    return fail(400, { error: 'Invalid host ID' })
  }

  const enabled = formData.get('enabled') === 'true'

  try {
    const existingHost = await proxyHostService.getProxyHostById(id)

    if (!existingHost) {
      return fail(404, { error: 'Proxy host not found' })
    }

    const userId = locals.user?.id || 0
    const updatedHost = await proxyHostService.updateProxyHost(id, { enabled }, userId)

    if (!updatedHost) {
      return fail(404, { error: 'Failed to update proxy host' })
    }

    return { success: true, host: updatedHost }
  } catch (error) {
    apiLogger.error({ error }, 'Failed to toggle proxy host status')
    return fail(500, { error: 'Failed to toggle proxy host status' })
  }
}
