/**
 * Server-side functionality for the proxy hosts page.
 * Handles loading proxy host data, managing hosts, and interacting with Caddy server.
 * @module routes/proxy-hosts/+page.server
 */
import type { Actions, PageServerLoad } from './$types'
import * as proxyHostController from '$lib/controllers/proxyHostController'
import * as proxyHostService from '$lib/services/proxyHostService'

/**
 * Loads proxy host data and Caddy server status for the proxy hosts page.
 * Fetches all proxy hosts from the database and enhances them with certificate information.
 *
 * @type {PageServerLoad}
 * @returns {Promise<{hosts: Array<Object>, caddyRunning: boolean}>} Proxy hosts with certificate info and Caddy status
 */
export const load = (async (event) => {
  return await proxyHostController.loadProxyHosts(event)
}) satisfies PageServerLoad

/**
 * Actions for the proxy hosts page.
 * Handles creating, updating, and deleting proxy hosts.
 *
 * @type {Actions}
 */
export const actions = {
  /**
   * Creates a new proxy host
   */
  create: async (event) => {
    return await proxyHostController.createProxyHost(event)
  },

  /**
   * Updates an existing proxy host
   */
  update: async (event) => {
    return await proxyHostController.updateProxyHost(event)
  },

  /**
   * Deletes a proxy host
   */
  delete: async (event) => {
    return await proxyHostController.deleteProxyHost(event)
  },

  /**
   * Toggles a proxy host's enabled status
   */
  toggle: async (event) => {
    return await proxyHostController.toggleProxyHost(event)
  },

  /**
   * Fetches certificate statuses for SSL-enabled hosts
   */
  fetchCertificates: async () => {
    const hostsWithCerts = await proxyHostService.getAllProxyHosts(true)
    const sslHosts = hostsWithCerts.filter((h) => h.sslEnabled)

    return {
      hosts: sslHosts
    }
  }
} satisfies Actions
