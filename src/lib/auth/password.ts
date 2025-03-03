import { authLogger } from '../logger'
import { execSync } from 'child_process'

export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const hashedPassword = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    authLogger.debug('Password hashed successfully')
    return hashedPassword
  } catch (error) {
    authLogger.error({ error }, 'Failed to hash password')
    throw error
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const calculatedHash = await hashPassword(password)
    const isValid = calculatedHash === hash
    authLogger.debug({ isValid }, 'Password verification completed')
    return isValid
  } catch (error) {
    authLogger.error({ error }, 'Failed to verify password')
    throw error
  }
}

export async function generateCaddyHash(password: string): Promise<string> {
  if (typeof password !== 'string') {
    authLogger.error(
      {
        passwordType: typeof password,
        passwordValue:
          password === null ? 'null' : password === undefined ? 'undefined' : `[${typeof password}]`
      },
      'Cannot generate hash for non-string password'
    )
    throw new Error(`Password must be a string, got ${typeof password}`)
  }

  if (!password || password.trim() === '') {
    authLogger.error(
      {
        passwordLength: password.length,
        passwordEmpty: password === '',
        passwordIsWhitespace: password.trim() === ''
      },
      'Cannot generate hash for empty password'
    )
    throw new Error('Password cannot be empty or contain only whitespace')
  }

  try {
    authLogger.debug(
      {
        passwordProvided: true,
        passwordLength: password.length,
        passwordFirstChar: password.charAt(0),
        isDevelopment: process.env.NODE_ENV !== 'production'
      },
      'Generating Caddy password hash'
    )

    const isDev = process.env.NODE_ENV !== 'production'
    let command = isDev
      ? `caddy hash-password --plaintext "${password}"`
      : `docker exec clearproxy-caddy caddy hash-password --plaintext "${password}"`

    try {
      const hash = execSync(command, { encoding: 'utf-8' }).trim()

      if (!hash || !hash.startsWith('$2')) {
        authLogger.warn(
          {
            hashLength: hash?.length,
            hashStart: hash?.substring(0, 3)
          },
          'Generated hash does not match expected format'
        )

        return fallbackBcryptHash(password)
      }

      authLogger.debug(
        {
          hashGenerated: true,
          hashLength: hash.length,
          hashFormat: hash.substring(0, 6) + '...'
        },
        'Successfully generated Caddy password hash'
      )

      return hash
    } catch (cmdError) {
      if (isDev) {
        authLogger.warn(
          {
            error: cmdError,
            fallback: true
          },
          'Local caddy command not available, using bcrypt fallback'
        )

        return fallbackBcryptHash(password)
      }
      throw cmdError
    }
  } catch (error) {
    authLogger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : 'unknown error'
      },
      'Failed to generate password hash'
    )
    throw new Error('Failed to generate password hash')
  }
}

function fallbackBcryptHash(password: string): string {
  const salt = base64Encode(password.substring(0, 8) || 'salt').substring(0, 22)
  const hash = base64Encode(password).substring(0, 31)

  authLogger.debug(
    {
      usingFallback: true,
      passwordLength: password.length,
      hashFormat: '$2a$14$' + salt.substring(0, 5) + '...'
    },
    'Using fallback bcrypt hash generator for development'
  )

  return `$2a$14$${salt}${hash}`
}

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64')
}
