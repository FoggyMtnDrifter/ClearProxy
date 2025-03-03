import { db } from '$lib/db'
import { proxyHosts } from '$lib/db/schema'
import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { reloadCaddyConfig, getCaddyStatus, getCertificateStatus } from '$lib/caddy/config'
import { apiLogger } from '$lib/logger'
import type { Actions, PageServerLoad } from './$types'
import { createAuditLog } from '$lib/db/audit'
import { generateCaddyHash } from '$lib/auth/password'
import { fixNullObjectPasswords } from '$lib/db'

export const load = (async ({ depends }) => {
  depends('app:proxy-hosts')
  depends('app:caddy-status')

  const [hosts, caddyStatus] = await Promise.all([
    db.select().from(proxyHosts).orderBy(proxyHosts.createdAt),
    getCaddyStatus()
  ])

  const fixedHosts = fixNullObjectPasswords(hosts)

  apiLogger.debug(
    {
      hosts: fixedHosts.map((h) => ({
        id: h.id,
        domain: h.domain,
        sslEnabled: h.sslEnabled
      }))
    },
    'Retrieved hosts from database'
  )

  const hostsWithCerts = await Promise.all(
    fixedHosts.map(async (host) => {
      if (!host.sslEnabled) {
        apiLogger.debug(
          { host: { domain: host.domain, sslEnabled: host.sslEnabled } },
          'Host has SSL disabled'
        )
        return { ...host, certInfo: null }
      }
      apiLogger.debug({ host: host.domain }, 'Fetching certificate info for SSL-enabled host')
      const certInfo = await getCertificateStatus(host.domain)
      return { ...host, certInfo }
    })
  )

  apiLogger.debug(
    {
      running: caddyStatus.running,
      version: caddyStatus.version
    },
    'Caddy status check completed'
  )

  return {
    hosts: hostsWithCerts,
    caddyStatus
  }
}) satisfies PageServerLoad

export const actions = {
  create: async ({ request, locals }) => {
    const data = await request.formData()
    const domain = data.get('domain')?.toString()
    let targetHost = data.get('targetHost')?.toString()
    const targetPort = parseInt(data.get('targetPort')?.toString() || '')
    const targetProtocol = data.get('targetProtocol')?.toString() || 'http'
    const sslEnabled = data.get('sslEnabled') === 'true'
    const forceSSL = data.get('forceSSL') === 'true'
    const http2Support = data.get('http2Support') === 'true'
    const http3Support = data.get('http3Support') === 'true'
    const advancedConfig = data.get('advancedConfig')?.toString() || ''
    const basicAuthEnabled = data.get('basicAuthEnabled') === 'true'
    const basicAuthUsername = data.get('basicAuthUsername')?.toString() || ''
    const basicAuthPassword = data.get('basicAuthPassword')?.toString()
    const ignoreInvalidCert = data.get('ignoreInvalidCert') === 'true'

    apiLogger.debug(
      {
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
      },
      'Detailed form data for proxy host creation'
    )

    if (basicAuthEnabled && (!basicAuthUsername || basicAuthUsername.trim() === '')) {
      apiLogger.warn(
        {
          basicAuthEnabled,
          hasUsername: !!basicAuthUsername,
          username: basicAuthUsername ? '***' : 'empty'
        },
        'Missing username for basic auth'
      )
      return fail(400, { error: 'Username is required when basic authentication is enabled' })
    }

    if (basicAuthEnabled && (!basicAuthPassword || basicAuthPassword.trim() === '')) {
      apiLogger.warn(
        {
          basicAuthEnabled,
          hasUsername: !!basicAuthUsername,
          hasPassword: !!basicAuthPassword,
          passwordType: typeof basicAuthPassword,
          passwordLength: basicAuthPassword?.length || 0
        },
        'Missing password for basic auth'
      )
      return fail(400, { error: 'Password is required when basic authentication is enabled' })
    }

    if (targetHost) {
      targetHost = targetHost
        .replace(/^https?:\/\//, '')
        .replace(/^\/+|\/+$/g, '')
        .trim()
    }

    apiLogger.info(
      {
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
      },
      'Creating new proxy host'
    )

    if (!domain || !targetHost || !targetPort) {
      apiLogger.warn(
        {
          hasDomain: !!domain,
          hasTargetHost: !!targetHost,
          hasTargetPort: !!targetPort
        },
        'Missing required fields for proxy host creation'
      )
      return fail(400, { error: 'All required fields must be provided' })
    }

    try {
      const caddyStatus = await getCaddyStatus()
      if (!caddyStatus.running) {
        apiLogger.error('Cannot create proxy host - Caddy server is not running')
        return fail(503, { error: 'Caddy server is not running' })
      }

      return await db.transaction(async (tx) => {
        apiLogger.debug('Starting transaction for proxy host creation')

        let hashedPassword = null
        if (basicAuthEnabled && basicAuthPassword && basicAuthPassword !== '') {
          try {
            apiLogger.debug(
              {
                passwordBeforeHash: 'provided',
                passwordType: typeof basicAuthPassword,
                passwordLength: basicAuthPassword.length
              },
              'About to generate password hash for new host'
            )

            hashedPassword = await generateCaddyHash(basicAuthPassword)

            apiLogger.debug(
              {
                hashedResult: !!hashedPassword,
                hashedType: typeof hashedPassword,
                hashedLength: hashedPassword?.length,
                hashStart: hashedPassword?.substring(0, 10) + '...',
                isValidHash: typeof hashedPassword === 'string' && hashedPassword.startsWith('$2')
              },
              'Generated password hash for new host basic auth'
            )

            if (typeof hashedPassword !== 'string' || !hashedPassword.startsWith('$2')) {
              apiLogger.error(
                {
                  hashedType: typeof hashedPassword,
                  hashedValue:
                    hashedPassword === null
                      ? 'null'
                      : hashedPassword === undefined
                        ? 'undefined'
                        : 'other',
                  startsWithBcrypt:
                    typeof hashedPassword === 'string' ? hashedPassword.startsWith('$2') : false
                },
                'Generated password hash is not valid for Caddy'
              )

              return fail(400, {
                error: 'Failed to generate a valid password hash. Please try again.'
              })
            }
          } catch (error) {
            apiLogger.error(
              {
                error,
                errorMessage: error instanceof Error ? error.message : 'unknown',
                passwordType: typeof basicAuthPassword
              },
              'Failed to hash password'
            )
            throw error
          }
        } else if (basicAuthEnabled) {
          apiLogger.warn(
            {
              basicAuthPassword,
              passwordLength: basicAuthPassword?.length || 0,
              passwordType: typeof basicAuthPassword,
              passwordEmpty: basicAuthPassword === ''
            },
            'Basic auth enabled but no valid password provided'
          )
          return fail(400, { error: 'Password is required when basic authentication is enabled' })
        }

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
            basicAuthPassword: hashedPassword === null ? null : String(hashedPassword),
            ignoreInvalidCert,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning()

        apiLogger.debug(
          {
            newHost: {
              id: newHost.id,
              domain: newHost.domain,
              basicAuthEnabled: newHost.basicAuthEnabled,
              hasUsername: !!newHost.basicAuthUsername,
              hasPassword: !!newHost.basicAuthPassword,
              passwordType: typeof newHost.basicAuthPassword,
              passwordIsString: typeof newHost.basicAuthPassword === 'string',
              passwordIsNull: newHost.basicAuthPassword === null,
              passwordLength:
                typeof newHost.basicAuthPassword === 'string'
                  ? newHost.basicAuthPassword.length
                  : 0,
              passwordHashStart:
                typeof newHost.basicAuthPassword === 'string' &&
                newHost.basicAuthPassword.length > 6
                  ? newHost.basicAuthPassword.substring(0, 6) + '...'
                  : 'n/a'
            }
          },
          'Created new proxy host in database'
        )

        const hosts = await tx.select().from(proxyHosts)

        const fixedHosts = fixNullObjectPasswords(hosts)

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
        })

        await reloadCaddyConfig(fixedHosts)

        return { success: true }
      })
    } catch (error) {
      apiLogger.error(
        {
          error,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : 'unknown',
          errorStack: error instanceof Error ? error.stack : 'unknown',
          domain,
          targetHost,
          targetPort
        },
        'Failed to create proxy host'
      )

      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, {
          error: 'Failed to update Caddy configuration',
          details: error.message
        })
      }

      return fail(500, { error: 'Failed to create proxy host' })
    }
  },

  edit: async ({ request, locals }) => {
    const data = await request.formData()
    const id = parseInt(data.get('id')?.toString() || '')
    const domain = data.get('domain')?.toString()
    let targetHost = data.get('targetHost')?.toString()
    const targetPort = parseInt(data.get('targetPort')?.toString() || '')
    const targetProtocol = data.get('targetProtocol')?.toString() || 'http'
    const sslEnabled = data.get('sslEnabled') === 'true'
    const forceSSL = data.get('forceSSL') === 'true'
    const http2Support = data.get('http2Support') === 'true'
    const http3Support = data.get('http3Support') === 'true'
    const advancedConfig = data.get('advancedConfig')?.toString() || ''
    const basicAuthEnabled = data.get('basicAuthEnabled') === 'true'
    const basicAuthUsername = data.get('basicAuthUsername')?.toString() || ''

    const passwordFieldExists = data.has('basicAuthPassword')
    const basicAuthPassword = passwordFieldExists
      ? data.get('basicAuthPassword')?.toString()
      : undefined

    const ignoreInvalidCert = data.get('ignoreInvalidCert') === 'true'

    apiLogger.info(
      {
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
      },
      'Editing proxy host'
    )

    if (basicAuthEnabled && (!basicAuthUsername || basicAuthUsername.trim() === '')) {
      apiLogger.warn('Missing username for basic auth')
      return fail(400, { error: 'Username is required when basic authentication is enabled' })
    }

    if (targetHost) {
      targetHost = targetHost
        .replace(/^https?:\/\//, '')
        .replace(/^\/+|\/+$/g, '')
        .trim()
    }

    if (!id || !domain || !targetHost || !targetPort) {
      apiLogger.warn('Missing required fields for proxy host update')
      return fail(400, { error: 'All required fields must be provided' })
    }

    try {
      return await db.transaction(async (tx) => {
        const [existingHost] = await tx.select().from(proxyHosts).where(eq(proxyHosts.id, id))

        if (!existingHost) {
          throw new Error('Proxy host not found')
        }

        const fixedExistingHost = fixNullObjectPasswords([existingHost])[0]

        if (basicAuthEnabled) {
          const _isNewHost = !fixedExistingHost.basicAuthPassword
          const isPasswordProvided = basicAuthPassword !== undefined && basicAuthPassword !== ''
          const isEnablingBasicAuth = basicAuthEnabled && !fixedExistingHost.basicAuthEnabled

          if (isEnablingBasicAuth && !isPasswordProvided) {
            apiLogger.warn('Password required when enabling basic auth for the first time')
            return fail(400, {
              error: 'Password is required when enabling basic authentication for the first time'
            })
          }
        }

        let hashedPassword = undefined
        if (basicAuthEnabled && basicAuthPassword !== undefined && basicAuthPassword !== '') {
          try {
            hashedPassword = await generateCaddyHash(basicAuthPassword)
          } catch (error) {
            apiLogger.error(
              {
                isNewHost: !fixedExistingHost.basicAuthPassword,
                passwordType: typeof basicAuthPassword
              },
              'Failed to hash password'
            )
            throw error
          }
        }

        let passwordToUse = null
        if (basicAuthEnabled) {
          if (hashedPassword !== undefined) {
            passwordToUse = hashedPassword
          } else if (!passwordFieldExists && fixedExistingHost.basicAuthPassword) {
            if (
              typeof fixedExistingHost.basicAuthPassword === 'string' &&
              fixedExistingHost.basicAuthPassword.length > 0
            ) {
              passwordToUse = fixedExistingHost.basicAuthPassword
            } else {
              return fail(400, {
                error: 'Password format is invalid. Please provide a new password.'
              })
            }
          } else if (passwordFieldExists && basicAuthPassword === '') {
            if (fixedExistingHost.basicAuthEnabled && fixedExistingHost.basicAuthPassword) {
              return fail(400, {
                error: 'Password cannot be cleared. To change the password, provide a new one.'
              })
            }
          } else if (!fixedExistingHost.basicAuthPassword) {
            return fail(400, { error: 'A password must be set for basic authentication' })
          } else {
            passwordToUse = fixedExistingHost.basicAuthPassword
          }
        }

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
          basicAuthPassword:
            passwordToUse === null || (typeof passwordToUse === 'object' && passwordToUse === null)
              ? null
              : String(passwordToUse),
          ignoreInvalidCert,
          updatedAt: new Date()
        }

        await tx.update(proxyHosts).set(updateObject).where(eq(proxyHosts.id, id))

        const hosts = await tx.select().from(proxyHosts)

        const fixedHosts = fixNullObjectPasswords(hosts)

        await createAuditLog({
          actionType: 'update',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            domain:
              domain !== fixedExistingHost.domain
                ? { from: fixedExistingHost.domain, to: domain }
                : undefined,
            targetHost:
              targetHost !== fixedExistingHost.targetHost
                ? { from: fixedExistingHost.targetHost, to: targetHost }
                : undefined,
            targetPort:
              targetPort !== fixedExistingHost.targetPort
                ? { from: fixedExistingHost.targetPort, to: targetPort }
                : undefined,
            targetProtocol:
              targetProtocol !== fixedExistingHost.targetProtocol
                ? { from: fixedExistingHost.targetProtocol, to: targetProtocol }
                : undefined,
            sslEnabled:
              sslEnabled !== fixedExistingHost.sslEnabled
                ? { from: fixedExistingHost.sslEnabled, to: sslEnabled }
                : undefined,
            forceSSL:
              forceSSL !== fixedExistingHost.forceSSL
                ? { from: fixedExistingHost.forceSSL, to: forceSSL }
                : undefined,
            http2Support:
              http2Support !== fixedExistingHost.http2Support
                ? { from: fixedExistingHost.http2Support, to: http2Support }
                : undefined,
            http3Support:
              http3Support !== fixedExistingHost.http3Support
                ? { from: fixedExistingHost.http3Support, to: http3Support }
                : undefined,
            basicAuthEnabled:
              basicAuthEnabled !== fixedExistingHost.basicAuthEnabled
                ? { from: fixedExistingHost.basicAuthEnabled, to: basicAuthEnabled }
                : undefined
          }
        })

        await reloadCaddyConfig(fixedHosts)

        return { success: true }
      })
    } catch (error) {
      apiLogger.error(
        {
          error,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : 'unknown'
        },
        'Failed to update proxy host'
      )

      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, {
          error: 'Failed to update Caddy configuration',
          details: error.message
        })
      }

      return fail(500, { error: 'Failed to update proxy host' })
    }
  },

  delete: async ({ request, locals }) => {
    const data = await request.formData()
    const id = parseInt(data.get('id')?.toString() || '')

    apiLogger.info({ id }, 'Deleting proxy host')

    if (!id) {
      apiLogger.warn('Missing host ID for delete operation')
      return fail(400, { error: 'Host ID must be provided' })
    }

    try {
      return await db.transaction(async (tx) => {
        const [existingHost] = await tx.select().from(proxyHosts).where(eq(proxyHosts.id, id))

        if (!existingHost) {
          throw new Error('Proxy host not found')
        }

        const fixedExistingHost = fixNullObjectPasswords([existingHost])[0]

        await tx.delete(proxyHosts).where(eq(proxyHosts.id, id))

        const hosts = await tx.select().from(proxyHosts)

        const fixedHosts = fixNullObjectPasswords(hosts)

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
        })

        await reloadCaddyConfig(fixedHosts)

        return { success: true }
      })
    } catch (error) {
      apiLogger.error(
        {
          error,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : 'unknown',
          errorStack: error instanceof Error ? error.stack : 'unknown'
        },
        'Failed to delete proxy host'
      )

      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, {
          error: 'Failed to update Caddy configuration',
          details: error.message
        })
      }

      return fail(500, { error: 'Failed to delete proxy host' })
    }
  },

  toggle: async ({ request, locals }) => {
    const data = await request.formData()
    const id = parseInt(data.get('id')?.toString() || '')
    const enabled = data.get('enabled') === 'true'

    apiLogger.info({ id, enabled }, 'Toggling proxy host status')

    if (!id) {
      apiLogger.warn('Missing host ID for toggle operation')
      return fail(400, { error: 'Host ID must be provided' })
    }

    try {
      return await db.transaction(async (tx) => {
        const [existingHost] = await tx.select().from(proxyHosts).where(eq(proxyHosts.id, id))

        if (!existingHost) {
          throw new Error('Proxy host not found')
        }

        const fixedExistingHost = fixNullObjectPasswords([existingHost])[0]

        await tx
          .update(proxyHosts)
          .set({ enabled, updatedAt: new Date() })
          .where(eq(proxyHosts.id, id))

        const hosts = await tx.select().from(proxyHosts)

        const fixedHosts = fixNullObjectPasswords(hosts)

        await createAuditLog({
          actionType: 'toggle',
          entityType: 'proxy_host',
          entityId: id,
          userId: locals.user?.id,
          changes: {
            enabled: { from: fixedExistingHost.enabled, to: enabled }
          }
        })

        await reloadCaddyConfig(fixedHosts)

        return { success: true }
      })
    } catch (error) {
      apiLogger.error(
        {
          error,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : 'unknown',
          errorStack: error instanceof Error ? error.stack : 'unknown'
        },
        'Failed to toggle proxy host status'
      )

      if (error instanceof Error && error.name === 'CaddyError') {
        return fail(503, {
          error: 'Failed to update Caddy configuration',
          details: error.message
        })
      }

      return fail(500, { error: 'Failed to toggle proxy host status' })
    }
  }
} satisfies Actions
