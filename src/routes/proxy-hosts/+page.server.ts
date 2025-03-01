/**
 * Server-side handling for proxy host management, including creation, editing, and status monitoring.
 * This module provides functionality for managing reverse proxy configurations through Caddy,
 * with support for SSL/TLS, HTTP/2, and basic authentication.
 */

import { db } from '$lib/db';
import { proxyHosts } from '$lib/db/schema';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { reloadCaddyConfig, getCaddyStatus, getCertificateStatus } from '$lib/caddy/config';
import { apiLogger } from '$lib/logger';
import type { Actions, PageServerLoad } from './$types';

/**
 * Cache for Caddy status to prevent too frequent checks
 */
let caddyStatusCache: { 
  status: { running: boolean; version: string } | null;
  timestamp: number;
} = {
  status: null,
  timestamp: 0
};

const CADDY_STATUS_CACHE_TTL = 5000; // 5 seconds

/**
 * Gets Caddy status with caching
 */
async function getCachedCaddyStatus(): Promise<{ running: boolean; version: string }> {
  const now = Date.now();
  if (caddyStatusCache.status && (now - caddyStatusCache.timestamp) < CADDY_STATUS_CACHE_TTL) {
    return caddyStatusCache.status;
  }

  const status = await getCaddyStatus();
  const newStatus = {
    running: status.running,
    version: status.version
  };
  
  caddyStatusCache = {
    status: newStatus,
    timestamp: now
  };
  
  return newStatus;
}

/**
 * Loads proxy host data and Caddy server status for the page.
 * Retrieves all configured proxy hosts from the database, ordered by creation date.
 * For SSL-enabled hosts, fetches their certificate status.
 * Also retrieves the current Caddy server status.
 * 
 * @returns {Promise<{
 *   hosts: Array<ProxyHost & { certInfo: any }>,
 *   caddyStatus: { running: boolean, version: string }
 * }>} Object containing proxy hosts with certificate info and Caddy status
 */
export const load = (async () => {
  const [hosts, caddyStatus] = await Promise.all([
    db.select().from(proxyHosts).orderBy(proxyHosts.createdAt),
    getCachedCaddyStatus()
  ]);

  apiLogger.debug({ hosts: hosts.map(h => ({
    id: h.id,
    domain: h.domain,
    sslEnabled: h.sslEnabled
  })) }, 'Retrieved hosts from database');

  // Get certificate status for each SSL-enabled host
  const hostsWithCerts = await Promise.all(
    hosts.map(async (host) => {
      if (!host.sslEnabled) {
        apiLogger.debug({ host: { domain: host.domain, sslEnabled: host.sslEnabled } }, 'Host has SSL disabled');
        return { ...host, certInfo: null };
      }
      apiLogger.debug({ host: host.domain }, 'Fetching certificate info for SSL-enabled host');
      const certInfo = await getCertificateStatus(host.domain);
      return { ...host, certInfo };
    })
  );

  apiLogger.info({
    running: caddyStatus.running,
    version: caddyStatus.version
  }, 'Caddy status check completed');

  return { 
    hosts: hostsWithCerts,
    caddyStatus
  };
}) satisfies PageServerLoad;

/**
 * Form actions for managing proxy hosts.
 */
export const actions = {
  /**
   * Creates a new proxy host configuration.
   * Validates required fields, checks Caddy server status, and updates the configuration.
   * Supports SSL/TLS, HTTP/2, and basic authentication options.
   * 
   * @param {Object} params - The action parameters
   * @param {Request} params.request - The form request containing proxy host configuration
   * @returns {Promise<{ success: true } | { error: string, details?: string }>} Success or error response
   * @throws Will return a 400 status if required fields are missing
   * @throws Will return a 503 status if Caddy server is not running
   * @throws Will return a 500 status for other errors
   */
  create: async ({ request }) => {
    const data = await request.formData();
    const domain = data.get('domain')?.toString();
    const targetHost = data.get('targetHost')?.toString();
    const targetPort = parseInt(data.get('targetPort')?.toString() || '');
    const sslEnabled = data.get('sslEnabled') === 'true';
    const forceSSL = data.get('forceSSL') === 'true';
    const http2Support = data.get('http2Support') === 'true';
    const advancedConfig = data.get('advancedConfig')?.toString() || '';
    const basicAuthEnabled = data.get('basicAuthEnabled') === 'true';
    const basicAuthUsername = data.get('basicAuthUsername')?.toString() || '';
    const basicAuthPassword = data.get('basicAuthPassword')?.toString() || '';

    apiLogger.info({
      domain,
      targetHost,
      targetPort,
      sslEnabled,
      forceSSL,
      http2Support,
      advancedConfig,
      basicAuthEnabled,
      basicAuthUsername: basicAuthUsername ? '***' : '',
      rawFormData: {
        sslEnabled: data.get('sslEnabled'),
        forceSSL: data.get('forceSSL'),
        http2Support: data.get('http2Support')
      }
    }, 'Creating new proxy host');

    if (!domain || !targetHost || !targetPort) {
      apiLogger.warn({
        hasDomain: !!domain,
        hasTargetHost: !!targetHost,
        hasTargetPort: !!targetPort,
        targetPortValue: data.get('targetPort')
      }, 'Missing required fields for proxy host creation');
      return fail(400, { error: 'All required fields must be provided' });
    }

    try {
      // Insert the new host
      await db.insert(proxyHosts).values({
        domain,
        targetHost,
        targetPort,
        sslEnabled,
        forceSSL,
        http2Support,
        advancedConfig,
        basicAuthEnabled,
        basicAuthUsername: basicAuthEnabled ? basicAuthUsername : null,
        basicAuthPassword: basicAuthEnabled ? basicAuthPassword : null,
        enabled: true
      });

      // Reload Caddy configuration with all hosts
      const hosts = await db.select().from(proxyHosts);
      await reloadCaddyConfig(hosts);

      // Invalidate Caddy status cache
      caddyStatusCache.status = null;

      return { success: true };
    } catch (error) {
      apiLogger.error({
        error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorStack: error instanceof Error ? error.stack : 'unknown'
      }, 'Failed to create proxy host');
      
      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, { 
          error: 'Failed to update Caddy configuration',
          details: error.message
        });
      }
      
      return fail(500, { error: 'Failed to create proxy host' });
    }
  },

  /**
   * Updates an existing proxy host configuration.
   * Validates required fields, checks Caddy server status, and updates the configuration.
   * Supports modifying SSL/TLS, HTTP/2, and basic authentication options.
   * 
   * @param {Object} params - The action parameters
   * @param {Request} params.request - The form request containing updated proxy host configuration
   * @returns {Promise<{ success: true } | { error: string, details?: string }>} Success or error response
   * @throws Will return a 400 status if required fields are missing
   * @throws Will return a 503 status if Caddy server is not running
   * @throws Will return a 500 status for other errors
   */
  edit: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '');
    const domain = data.get('domain')?.toString();
    const targetHost = data.get('targetHost')?.toString();
    const targetPort = parseInt(data.get('targetPort')?.toString() || '');
    const sslEnabled = data.get('sslEnabled') === 'true';
    const forceSSL = data.get('forceSSL') === 'true';
    const http2Support = data.get('http2Support') === 'true';
    const advancedConfig = data.get('advancedConfig')?.toString() || '';
    const basicAuthEnabled = data.get('basicAuthEnabled') === 'true';
    const basicAuthUsername = data.get('basicAuthUsername')?.toString() || '';
    const basicAuthPassword = data.get('basicAuthPassword')?.toString() || '';

    apiLogger.info({
      id,
      domain,
      targetHost,
      targetPort,
      sslEnabled,
      forceSSL,
      http2Support,
      advancedConfig,
      basicAuthEnabled,
      basicAuthUsername: basicAuthUsername ? '***' : ''
    }, 'Editing proxy host');

    if (!id || !domain || !targetHost || !targetPort) {
      apiLogger.warn({
        hasId: !!id,
        hasDomain: !!domain,
        hasTargetHost: !!targetHost,
        hasTargetPort: !!targetPort
      }, 'Missing required fields for proxy host update');
      return fail(400, { error: 'All required fields must be provided' });
    }

    try {
      // Update the proxy host
      await db
        .update(proxyHosts)
        .set({
          domain,
          targetHost,
          targetPort,
          sslEnabled,
          forceSSL,
          http2Support,
          advancedConfig,
          basicAuthEnabled,
          basicAuthUsername: basicAuthEnabled ? basicAuthUsername : null,
          basicAuthPassword: basicAuthEnabled ? basicAuthPassword : null,
          updatedAt: new Date()
        })
        .where(eq(proxyHosts.id, id));

      // Reload Caddy configuration with all hosts
      const hosts = await db.select().from(proxyHosts);
      await reloadCaddyConfig(hosts);

      // Invalidate Caddy status cache
      caddyStatusCache.status = null;

      return { success: true };
    } catch (error) {
      apiLogger.error({
        error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorStack: error instanceof Error ? error.stack : 'unknown'
      }, 'Failed to update proxy host');

      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, { 
          error: 'Failed to update Caddy configuration',
          details: error.message
        });
      }

      return fail(500, { error: 'Failed to update proxy host' });
    }
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '');

    apiLogger.info({ id }, 'Deleting proxy host');

    if (!id) {
      apiLogger.warn('Missing host ID for deletion');
      return fail(400, { error: 'Host ID must be provided' });
    }

    try {
      // Delete the proxy host
      await db.delete(proxyHosts).where(eq(proxyHosts.id, id));

      // Reload Caddy configuration with remaining hosts
      const hosts = await db.select().from(proxyHosts);
      await reloadCaddyConfig(hosts);

      // Invalidate Caddy status cache
      caddyStatusCache.status = null;

      return { success: true };
    } catch (error) {
      apiLogger.error({
        error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorStack: error instanceof Error ? error.stack : 'unknown'
      }, 'Failed to delete proxy host');

      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, { 
          error: 'Failed to update Caddy configuration',
          details: error.message
        });
      }

      return fail(500, { error: 'Failed to delete proxy host' });
    }
  },

  toggle: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '');
    const enabled = data.get('enabled') === 'true';

    apiLogger.info({ id, enabled }, 'Toggling proxy host status');

    if (!id) {
      apiLogger.warn('Missing host ID for toggle operation');
      return fail(400, { error: 'Host ID must be provided' });
    }

    try {
      // Update the enabled status
      await db
        .update(proxyHosts)
        .set({ enabled, updatedAt: new Date() })
        .where(eq(proxyHosts.id, id));

      // Reload Caddy configuration with updated hosts
      const hosts = await db.select().from(proxyHosts);
      await reloadCaddyConfig(hosts);

      // Invalidate Caddy status cache
      caddyStatusCache.status = null;

      return { success: true };
    } catch (error) {
      apiLogger.error({
        error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorStack: error instanceof Error ? error.stack : 'unknown'
      }, 'Failed to toggle proxy host status');

      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, { 
          error: 'Failed to update Caddy configuration',
          details: error.message
        });
      }

      return fail(500, { error: 'Failed to toggle proxy host status' });
    }
  }
} satisfies Actions; 