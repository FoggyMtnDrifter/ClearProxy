/**
 * Controller for proxy host API routes.
 * Handles HTTP requests for proxy host operations.
 * @module controllers/proxyHostController
 */
import * as proxyHostService from '$lib/services/proxyHostService'
import { fail } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { apiLogger } from '$lib/utils/logger'

// Extended RequestEvent type that includes the depends method
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
    proxyHostService.getAllProxyHosts(),
    proxyHostService.getCaddyServerStatus()
  ])

  return {
    hosts,
    caddyRunning: caddyStatus.running
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

  // Extract form data
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

  // Validate required fields
  if (!domain) {
    return fail(400, { error: 'Domain is required' })
  }

  if (!targetHost) {
    return fail(400, { error: 'Target host is required' })
  }

  // Create host data object
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

  // Try to get ID from URL params first, then from form data
  let id = parseInt(params.id || '0', 10)

  // If ID is not in URL params, try to get it from form data
  if (!id) {
    const formId = formData.get('id')
    id = formId ? parseInt(formId.toString(), 10) : 0
  }

  if (!id) {
    return fail(400, { error: 'Invalid host ID' })
  }

  // Extract form data
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

  // Validate required fields
  if (!domain) {
    return fail(400, { error: 'Domain is required' })
  }

  if (!targetHost) {
    return fail(400, { error: 'Target host is required' })
  }

  // Create host data object
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

  // Try to get ID from URL params first, then from form data
  let id = parseInt(params.id || '0', 10)

  // If ID is not in URL params, try to get it from form data
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
