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
import { createAuditLog } from '$lib/db/audit';

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
export const load = (async ({ depends }) => {
  // Tell SvelteKit this load function depends on these custom invalidation keys
  depends('app:proxy-hosts');
  depends('app:caddy-status');

  const [hosts, caddyStatus] = await Promise.all([
    db.select().from(proxyHosts).orderBy(proxyHosts.createdAt),
    getCaddyStatus()
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
  create: async ({ request, locals }) => {
    const data = await request.formData();
    const domain = data.get('domain')?.toString();
    let targetHost = data.get('targetHost')?.toString();
    const targetPort = parseInt(data.get('targetPort')?.toString() || '');
    const targetProtocol = data.get('targetProtocol')?.toString() || 'http';
    const sslEnabled = data.get('sslEnabled') === 'true';
    const forceSSL = data.get('forceSSL') === 'true';
    const http2Support = data.get('http2Support') === 'true';
    const http3Support = data.get('http3Support') === 'true';
    const advancedConfig = data.get('advancedConfig')?.toString() || '';
    const basicAuthEnabled = data.get('basicAuthEnabled') === 'true';
    const basicAuthUsername = data.get('basicAuthUsername')?.toString() || '';
    const basicAuthPassword = data.get('basicAuthPassword')?.toString() || '';
    const ignoreInvalidCert = data.get('ignoreInvalidCert') === 'true';

    // Clean the target host by removing any protocol prefixes and slashes
    if (targetHost) {
      targetHost = targetHost
        .replace(/^https?:\/\//, '')  // Remove any protocol prefix
        .replace(/^\/+|\/+$/g, '')    // Remove leading and trailing slashes
        .trim();                      // Remove any whitespace
    }

    apiLogger.info({
      domain,
      targetHost,
      targetPort,
      targetProtocol,
      sslEnabled,
      forceSSL,
      http2Support,
      http3Support,
      advancedConfig,
      basicAuthEnabled,
      basicAuthUsername: basicAuthUsername ? '***' : '',
      rawFormData: {
        sslEnabled: data.get('sslEnabled'),
        forceSSL: data.get('forceSSL'),
        http2Support: data.get('http2Support'),
        http3Support: data.get('http3Support')
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
      // Start a transaction
      return await db.transaction(async (tx) => {
        apiLogger.debug('Starting transaction for proxy host creation');
        
        // Create the proxy host within the transaction
        const [newHost] = await tx
          .insert(proxyHosts)
          .values({
            domain,
            targetHost,
            targetPort,
            targetProtocol,
            sslEnabled,
            forceSSL,
            http2Support,
            http3Support,
            advancedConfig,
            basicAuthEnabled,
            basicAuthUsername: basicAuthEnabled ? basicAuthUsername : null,
            basicAuthPassword: basicAuthEnabled ? basicAuthPassword : null,
            ignoreInvalidCert,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        apiLogger.debug({ newHost: { id: newHost.id, domain: newHost.domain } }, 'Created new proxy host in database');

        // Get all hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);

        // Create audit log
        await createAuditLog({
          actionType: 'create',
          entityType: 'proxy_host',
          entityId: newHost.id,
          userId: locals.user?.id,
          changes: {
            domain,
            targetHost,
            targetPort,
            targetProtocol,
            sslEnabled,
            forceSSL,
            http2Support,
            http3Support,
            basicAuthEnabled
          }
        });

        // Try to update Caddy configuration
        try {
          apiLogger.debug('Attempting to reload Caddy configuration');
          await reloadCaddyConfig(hosts);
          apiLogger.info('Successfully reloaded Caddy configuration');
        } catch (error) {
          apiLogger.error({
            error,
            errorName: error instanceof Error ? error.name : 'unknown',
            errorMessage: error instanceof Error ? error.message : 'unknown',
            errorStack: error instanceof Error ? error.stack : 'unknown',
            newHost: { id: newHost.id, domain: newHost.domain }
          }, 'Failed to update Caddy configuration - rolling back transaction');
          
          // Re-throw the error to trigger transaction rollback
          throw error;
        }

        return { success: true };
      });
    } catch (error) {
      apiLogger.error({
        error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        errorStack: error instanceof Error ? error.stack : 'unknown',
        domain,
        targetHost,
        targetPort
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
  edit: async ({ request, locals }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '');
    const domain = data.get('domain')?.toString();
    let targetHost = data.get('targetHost')?.toString();
    const targetPort = parseInt(data.get('targetPort')?.toString() || '');
    const targetProtocol = data.get('targetProtocol')?.toString() || 'http';
    const sslEnabled = data.get('sslEnabled') === 'true';
    const forceSSL = data.get('forceSSL') === 'true';
    const http2Support = data.get('http2Support') === 'true';
    const http3Support = data.get('http3Support') === 'true';
    const advancedConfig = data.get('advancedConfig')?.toString() || '';
    const basicAuthEnabled = data.get('basicAuthEnabled') === 'true';
    const basicAuthUsername = data.get('basicAuthUsername')?.toString() || '';
    const basicAuthPassword = data.get('basicAuthPassword')?.toString() || '';
    const ignoreInvalidCert = data.get('ignoreInvalidCert') === 'true';

    // Clean the target host by removing any protocol prefixes and slashes
    if (targetHost) {
      targetHost = targetHost
        .replace(/^https?:\/\//, '')  // Remove any protocol prefix
        .replace(/^\/+|\/+$/g, '')    // Remove leading and trailing slashes
        .trim();                      // Remove any whitespace
    }

    apiLogger.info({
      id,
      domain,
      targetHost,
      targetPort,
      targetProtocol,
      sslEnabled,
      forceSSL,
      http2Support,
      http3Support,
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
      // Start a transaction
      return await db.transaction(async (tx) => {
        // Get the existing host
        const [existingHost] = await tx
          .select()
          .from(proxyHosts)
          .where(eq(proxyHosts.id, id));

        if (!existingHost) {
          throw new Error('Proxy host not found');
        }

        // Update the proxy host within the transaction
        await tx
          .update(proxyHosts)
          .set({
            domain,
            targetHost,
            targetPort,
            targetProtocol,
            sslEnabled,
            forceSSL,
            http2Support,
            http3Support,
            advancedConfig,
            basicAuthEnabled,
            basicAuthUsername: basicAuthEnabled ? basicAuthUsername : null,
            basicAuthPassword: basicAuthEnabled ? basicAuthPassword : null,
            ignoreInvalidCert,
            updatedAt: new Date()
          })
          .where(eq(proxyHosts.id, id));

        // Get all hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);

        // Create audit log with changes
        await createAuditLog({
          actionType: 'update',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            domain: domain !== existingHost.domain ? { from: existingHost.domain, to: domain } : undefined,
            targetHost: targetHost !== existingHost.targetHost ? { from: existingHost.targetHost, to: targetHost } : undefined,
            targetPort: targetPort !== existingHost.targetPort ? { from: existingHost.targetPort, to: targetPort } : undefined,
            targetProtocol: targetProtocol !== existingHost.targetProtocol ? { from: existingHost.targetProtocol, to: targetProtocol } : undefined,
            sslEnabled: sslEnabled !== existingHost.sslEnabled ? { from: existingHost.sslEnabled, to: sslEnabled } : undefined,
            forceSSL: forceSSL !== existingHost.forceSSL ? { from: existingHost.forceSSL, to: forceSSL } : undefined,
            http2Support: http2Support !== existingHost.http2Support ? { from: existingHost.http2Support, to: http2Support } : undefined,
            http3Support: http3Support !== existingHost.http3Support ? { from: existingHost.http3Support, to: http3Support } : undefined,
            basicAuthEnabled: basicAuthEnabled !== existingHost.basicAuthEnabled ? { from: existingHost.basicAuthEnabled, to: basicAuthEnabled } : undefined
          }
        });

        // Try to update Caddy configuration
        try {
          await reloadCaddyConfig(hosts);
        } catch (error) {
          // If Caddy update fails, the transaction will be rolled back
          throw error;
        }

        return { success: true };
      });
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

  delete: async ({ request, locals }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '');

    apiLogger.info({ id }, 'Deleting proxy host');

    if (!id) {
      apiLogger.warn('Missing host ID for delete operation');
      return fail(400, { error: 'Host ID must be provided' });
    }

    try {
      // Start a transaction
      return await db.transaction(async (tx) => {
        // Get the existing host
        const [existingHost] = await tx
          .select()
          .from(proxyHosts)
          .where(eq(proxyHosts.id, id));

        if (!existingHost) {
          throw new Error('Proxy host not found');
        }

        // Delete the proxy host within the transaction
        await tx
          .delete(proxyHosts)
          .where(eq(proxyHosts.id, id));

        // Get all remaining hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);

        // Create audit log
        await createAuditLog({
          actionType: 'delete',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            domain: existingHost.domain,
            targetHost: existingHost.targetHost,
            targetPort: existingHost.targetPort
          }
        });

        // Try to update Caddy configuration
        try {
          await reloadCaddyConfig(hosts);
        } catch (error) {
          // If Caddy update fails, the transaction will be rolled back
          throw error;
        }

        return { success: true };
      });
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

  toggle: async ({ request, locals }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '');
    const enabled = data.get('enabled') === 'true';

    apiLogger.info({ id, enabled }, 'Toggling proxy host status');

    if (!id) {
      apiLogger.warn('Missing host ID for toggle operation');
      return fail(400, { error: 'Host ID must be provided' });
    }

    try {
      // Start a transaction
      return await db.transaction(async (tx) => {
        // Get the existing host
        const [existingHost] = await tx
          .select()
          .from(proxyHosts)
          .where(eq(proxyHosts.id, id));

        if (!existingHost) {
          throw new Error('Proxy host not found');
        }

        // Update the enabled status within the transaction
        await tx
          .update(proxyHosts)
          .set({ enabled, updatedAt: new Date() })
          .where(eq(proxyHosts.id, id));

        // Get all hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);

        // Create audit log
        await createAuditLog({
          actionType: 'toggle',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            enabled: { from: existingHost.enabled, to: enabled }
          }
        });

        // Try to update Caddy configuration
        try {
          await reloadCaddyConfig(hosts);
        } catch (error) {
          // If Caddy update fails, the transaction will be rolled back
          throw error;
        }

        return { success: true };
      });
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