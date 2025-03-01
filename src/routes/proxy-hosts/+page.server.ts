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
import { generateCaddyHash } from '$lib/auth/password';
import { fixNullObjectPasswords } from '$lib/db';

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

  // Fix any null object passwords
  const fixedHosts = fixNullObjectPasswords(hosts);

  apiLogger.debug({ hosts: fixedHosts.map(h => ({
    id: h.id,
    domain: h.domain,
    sslEnabled: h.sslEnabled
  })) }, 'Retrieved hosts from database');

  // Get certificate status for each SSL-enabled host
  const hostsWithCerts = await Promise.all(
    fixedHosts.map(async (host) => {
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
    const basicAuthPassword = data.get('basicAuthPassword')?.toString();  // Don't default to empty string
    const ignoreInvalidCert = data.get('ignoreInvalidCert') === 'true';

    apiLogger.debug({
      basicAuthEnabled,
      hasUsername: !!basicAuthUsername,
      usernameValue: basicAuthUsername,
      usernameType: typeof basicAuthUsername,
      usernameLength: basicAuthUsername?.length || 0,
      hasPassword: basicAuthPassword !== undefined,
      passwordType: typeof basicAuthPassword,
      passwordLength: basicAuthPassword?.length || 0,
      passwordIsEmptyString: basicAuthPassword === '',
      allFormKeys: [...data.keys()].join(', ')
    }, 'Detailed form data for proxy host creation');

    if (basicAuthEnabled && (!basicAuthUsername || basicAuthUsername.trim() === '')) {
      apiLogger.warn({
        basicAuthEnabled,
        hasUsername: !!basicAuthUsername,
        username: basicAuthUsername ? '***' : 'empty'
      }, 'Missing username for basic auth');
      return fail(400, { error: 'Username is required when basic authentication is enabled' });
    }

    // Require a password when basic auth is enabled
    if (basicAuthEnabled && (!basicAuthPassword || basicAuthPassword.trim() === '')) {
      apiLogger.warn({
        basicAuthEnabled,
        hasUsername: !!basicAuthUsername,
        hasPassword: !!basicAuthPassword,
        passwordType: typeof basicAuthPassword,
        passwordLength: basicAuthPassword?.length || 0
      }, 'Missing password for basic auth');
      return fail(400, { error: 'Password is required when basic authentication is enabled' });
    }

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
      hasPassword: !!basicAuthPassword,
      passwordLength: basicAuthPassword?.length || 0
    }, 'Creating new proxy host');

    if (!domain || !targetHost || !targetPort) {
      apiLogger.warn({
        hasDomain: !!domain,
        hasTargetHost: !!targetHost,
        hasTargetPort: !!targetPort
      }, 'Missing required fields for proxy host creation');
      return fail(400, { error: 'All required fields must be provided' });
    }

    try {
      // First check if Caddy is running
      const caddyStatus = await getCaddyStatus();
      if (!caddyStatus.running) {
        apiLogger.error('Cannot create proxy host - Caddy server is not running');
        return fail(503, { error: 'Caddy server is not running' });
      }

      // Start a transaction
      return await db.transaction(async (tx) => {
        apiLogger.debug('Starting transaction for proxy host creation');
        
        // Hash the password if basic auth is enabled
        let hashedPassword = null;
        if (basicAuthEnabled && basicAuthPassword && basicAuthPassword !== '') {
          try {
            apiLogger.debug({
              passwordBeforeHash: 'provided',
              passwordType: typeof basicAuthPassword,
              passwordLength: basicAuthPassword.length
            }, 'About to generate password hash for new host');
            
            hashedPassword = await generateCaddyHash(basicAuthPassword);
            
            apiLogger.debug({
              hashedResult: !!hashedPassword,
              hashedType: typeof hashedPassword,
              hashedLength: hashedPassword?.length,
              hashStart: hashedPassword?.substring(0, 10) + '...',
              isValidHash: typeof hashedPassword === 'string' && hashedPassword.startsWith('$2')
            }, 'Generated password hash for new host basic auth');

            // Validate the generated hash to ensure it's in the correct format
            if (typeof hashedPassword !== 'string' || !hashedPassword.startsWith('$2')) {
              apiLogger.error({
                hashedType: typeof hashedPassword,
                hashedValue: hashedPassword === null ? 'null' : hashedPassword === undefined ? 'undefined' : 'other',
                startsWithBcrypt: typeof hashedPassword === 'string' ? hashedPassword.startsWith('$2') : false
              }, 'Generated password hash is not valid for Caddy');
              
              return fail(400, { error: 'Failed to generate a valid password hash. Please try again.' });
            }
          } catch (error) {
            apiLogger.error({ 
              error,
              errorMessage: error instanceof Error ? error.message : 'unknown',
              passwordType: typeof basicAuthPassword
            }, 'Failed to hash password');
            throw error;
          }
        } else if (basicAuthEnabled) {
          apiLogger.warn({
            basicAuthPassword,
            passwordLength: basicAuthPassword?.length || 0,
            passwordType: typeof basicAuthPassword,
            passwordEmpty: basicAuthPassword === ''
          }, 'Basic auth enabled but no valid password provided');
          return fail(400, { error: 'Password is required when basic authentication is enabled' });
        }

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
            // Ensure we're using a proper string for the password hash
            basicAuthPassword: hashedPassword === null ? null : String(hashedPassword), 
            ignoreInvalidCert,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        apiLogger.debug({ 
          newHost: { 
            id: newHost.id, 
            domain: newHost.domain,
            basicAuthEnabled: newHost.basicAuthEnabled,
            hasUsername: !!newHost.basicAuthUsername,
            hasPassword: !!newHost.basicAuthPassword,
            passwordType: typeof newHost.basicAuthPassword,
            passwordIsString: typeof newHost.basicAuthPassword === 'string',
            passwordIsNull: newHost.basicAuthPassword === null,
            passwordLength: typeof newHost.basicAuthPassword === 'string' ? newHost.basicAuthPassword.length : 0,
            passwordHashStart: typeof newHost.basicAuthPassword === 'string' && newHost.basicAuthPassword.length > 6 ? 
                              newHost.basicAuthPassword.substring(0, 6) + '...' : 'n/a'
          } 
        }, 'Created new proxy host in database');

        // Get all hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);

        // Fix any null object passwords in the hosts array
        const fixedHosts = fixNullObjectPasswords(hosts);

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
          await reloadCaddyConfig(fixedHosts);
          apiLogger.info('Successfully reloaded Caddy configuration');
        } catch (error) {
          apiLogger.error({
            error,
            errorName: error instanceof Error ? error.name : 'unknown',
            errorMessage: error instanceof Error ? error.message : 'unknown',
            errorStack: error instanceof Error ? error.stack : 'unknown',
            newHost: { id: newHost.id, domain: newHost.domain }
          }, 'Failed to update Caddy configuration - rolling back transaction');
          
          // Delete the newly created host
          await tx
            .delete(proxyHosts)
            .where(eq(proxyHosts.id, newHost.id));
          
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
    
    // Check if the password field exists in the form data
    // If it doesn't exist, it means we should keep the existing password
    const passwordFieldExists = data.has('basicAuthPassword');
    const basicAuthPassword = passwordFieldExists ? data.get('basicAuthPassword')?.toString() : undefined;
    
    const ignoreInvalidCert = data.get('ignoreInvalidCert') === 'true';

    // Log concise form data
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
      basicAuthUsername: basicAuthUsername ? '***' : '',
      passwordProvided: basicAuthPassword !== undefined
    }, 'Editing proxy host');

    if (basicAuthEnabled && (!basicAuthUsername || basicAuthUsername.trim() === '')) {
      apiLogger.warn('Missing username for basic auth');
      return fail(400, { error: 'Username is required when basic authentication is enabled' });
    }

    // Clean the target host by removing any protocol prefixes and slashes
    if (targetHost) {
      targetHost = targetHost
        .replace(/^https?:\/\//, '')  // Remove any protocol prefix
        .replace(/^\/+|\/+$/g, '')    // Remove leading and trailing slashes
        .trim();                      // Remove any whitespace
    }

    if (!id || !domain || !targetHost || !targetPort) {
      apiLogger.warn('Missing required fields for proxy host update');
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

        // Fix any null object password in the existing host
        const fixedExistingHost = fixNullObjectPasswords([existingHost])[0];
        
        // If basic auth is enabled, we need to check if we have a password (new or existing)
        if (basicAuthEnabled) {
          const isNewHost = !fixedExistingHost.basicAuthPassword;
          const isPasswordProvided = basicAuthPassword !== undefined && basicAuthPassword !== '';
          const isEnablingBasicAuth = basicAuthEnabled && !fixedExistingHost.basicAuthEnabled;
          
          // Only require a password when basic auth is being newly enabled and no password is provided
          if (isEnablingBasicAuth && !isPasswordProvided) {
            apiLogger.warn('Password required when enabling basic auth for the first time');
            return fail(400, { error: 'Password is required when enabling basic authentication for the first time' });
          }
        }

        // Hash the new password if provided
        let hashedPassword = undefined;
        if (basicAuthEnabled && basicAuthPassword !== undefined && basicAuthPassword !== '') {
          try {
            hashedPassword = await generateCaddyHash(basicAuthPassword);
          } catch (error) {
            apiLogger.error({ 
              error,
              passwordType: typeof basicAuthPassword
            }, 'Failed to hash password');
            throw error;
          }
        }

        // Determine the password to use
        let passwordToUse = null; // Initialize to null explicitly
        if (basicAuthEnabled) {
          // If a new password was provided, use it
          if (hashedPassword !== undefined) {
            passwordToUse = hashedPassword;
          } 
          // If no new password was provided and we're not supposed to change it, keep existing
          else if (!passwordFieldExists && fixedExistingHost.basicAuthPassword) {
            // Make sure the existing password is valid
            if (typeof fixedExistingHost.basicAuthPassword === 'string' && 
                fixedExistingHost.basicAuthPassword.length > 0) {
              passwordToUse = fixedExistingHost.basicAuthPassword;
            } else {
              return fail(400, { error: 'Password format is invalid. Please provide a new password.' });
            }
          }
          // If the password field was explicitly cleared
          else if (passwordFieldExists && basicAuthPassword === '') {
            // Check if we should prevent clearing
            if (fixedExistingHost.basicAuthEnabled && fixedExistingHost.basicAuthPassword) {
              return fail(400, { error: 'Password cannot be cleared. To change the password, provide a new one.' });
            }
          }
          // No existing password and no new password
          else if (!fixedExistingHost.basicAuthPassword) {
            return fail(400, { error: 'A password must be set for basic authentication' });
          }
          // Default: keep existing if available
          else {
            passwordToUse = fixedExistingHost.basicAuthPassword;
          }
        }

        // Update the proxy host within the transaction
        const updateObject = {
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
          // Ensure the password is explicitly a string or null (not undefined or object)
          basicAuthPassword: passwordToUse === null || 
                            (typeof passwordToUse === 'object' && passwordToUse === null) ? 
                            null : 
                            String(passwordToUse),
          ignoreInvalidCert,
          updatedAt: new Date()
        };
        
        await tx
          .update(proxyHosts)
          .set(updateObject)
          .where(eq(proxyHosts.id, id));

        // Get all hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);

        // Fix any null object passwords in the hosts array
        const fixedHosts = fixNullObjectPasswords(hosts);

        // Create audit log with changes
        await createAuditLog({
          actionType: 'update',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            domain: domain !== fixedExistingHost.domain ? { from: fixedExistingHost.domain, to: domain } : undefined,
            targetHost: targetHost !== fixedExistingHost.targetHost ? { from: fixedExistingHost.targetHost, to: targetHost } : undefined,
            targetPort: targetPort !== fixedExistingHost.targetPort ? { from: fixedExistingHost.targetPort, to: targetPort } : undefined,
            targetProtocol: targetProtocol !== fixedExistingHost.targetProtocol ? { from: fixedExistingHost.targetProtocol, to: targetProtocol } : undefined,
            sslEnabled: sslEnabled !== fixedExistingHost.sslEnabled ? { from: fixedExistingHost.sslEnabled, to: sslEnabled } : undefined,
            forceSSL: forceSSL !== fixedExistingHost.forceSSL ? { from: fixedExistingHost.forceSSL, to: forceSSL } : undefined,
            http2Support: http2Support !== fixedExistingHost.http2Support ? { from: fixedExistingHost.http2Support, to: http2Support } : undefined,
            http3Support: http3Support !== fixedExistingHost.http3Support ? { from: fixedExistingHost.http3Support, to: http3Support } : undefined,
            basicAuthEnabled: basicAuthEnabled !== fixedExistingHost.basicAuthEnabled ? { from: fixedExistingHost.basicAuthEnabled, to: basicAuthEnabled } : undefined
          }
        });

        // Try to update Caddy configuration
        try {
          await reloadCaddyConfig(fixedHosts);
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
        errorMessage: error instanceof Error ? error.message : 'unknown'
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

        // Fix any null object password
        const fixedExistingHost = fixNullObjectPasswords([existingHost])[0];

        // Delete the proxy host within the transaction
        await tx
          .delete(proxyHosts)
          .where(eq(proxyHosts.id, id));

        // Get all remaining hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);
        
        // Fix any null object passwords in the hosts array
        const fixedHosts = fixNullObjectPasswords(hosts);

        // Create audit log
        await createAuditLog({
          actionType: 'delete',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            domain: fixedExistingHost.domain,
            targetHost: fixedExistingHost.targetHost,
            targetPort: fixedExistingHost.targetPort
          }
        });

        // Try to update Caddy configuration
        try {
          await reloadCaddyConfig(fixedHosts);
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

        // Fix any null object password
        const fixedExistingHost = fixNullObjectPasswords([existingHost])[0];

        // Update the enabled status within the transaction
        await tx
          .update(proxyHosts)
          .set({ enabled, updatedAt: new Date() })
          .where(eq(proxyHosts.id, id));

        // Get all hosts within the transaction
        const hosts = await tx.select().from(proxyHosts);
        
        // Fix any null object passwords in the hosts array
        const fixedHosts = fixNullObjectPasswords(hosts);

        // Create audit log
        await createAuditLog({
          actionType: 'toggle',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            enabled: { from: fixedExistingHost.enabled, to: enabled }
          }
        });

        // Try to update Caddy configuration
        try {
          await reloadCaddyConfig(fixedHosts);
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