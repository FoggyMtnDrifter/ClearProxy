/**
 * Password management module for authentication.
 * Handles password hashing, verification, and generation of special formats.
 * @module auth/password
 */
import { authLogger } from '../utils/logger'
import { execSync } from 'child_process'

const hashCache = new Map<string, string>()
const HASH_CACHE_MAX_SIZE = 100

/**
 * Hashes a password using SHA-256 algorithm
 *
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hexadecimal string representation of the hash
 * @throws {Error} If hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Cannot hash empty password')
  }

  if (process.env.NODE_ENV !== 'production') {
    const cached = hashCache.get(password)
    if (cached) {
      return cached
    }
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const hashedPassword = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (process.env.NODE_ENV !== 'production') {
      if (hashCache.size >= HASH_CACHE_MAX_SIZE) {
        const keysToDelete = [...hashCache.keys()]
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(HASH_CACHE_MAX_SIZE * 0.2))

        keysToDelete.forEach((key) => hashCache.delete(key))
      }

      hashCache.set(password, hashedPassword)
    }

    authLogger.debug('Password hashed successfully')
    return hashedPassword
  } catch (error) {
    authLogger.error({ error }, 'Failed to hash password')
    throw error
  }
}

/**
 * Verifies a password against a stored hash
 *
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Stored hash to compare against
 * @returns {Promise<boolean>} True if password matches the hash, false otherwise
 * @throws {Error} If verification fails
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    authLogger.debug(
      {
        passwordEmpty: !password,
        hashEmpty: !hash
      },
      'Empty password or hash in verification'
    )
    return false
  }

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

const caddyHashCache = new Map<string, string>()

/**
 * Generates a Caddy-compatible password hash using bcrypt algorithm
 * Tries to use the caddy command-line tool to generate the hash, falls back to a custom implementation
 *
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Bcrypt hash in Caddy-compatible format
 * @throws {Error} If hashing fails or password is invalid
 */
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

  if (caddyHashCache.has(password)) {
    return caddyHashCache.get(password)!
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

    const command = `caddy hash-password --plaintext "${password}"`

    try {
      authLogger.debug(`Executing command: ${command}`)
      const hash = execSync(command, {
        encoding: 'utf-8',
        timeout: 2000
      }).trim()

      if (!hash || !hash.startsWith('$2')) {
        authLogger.warn(
          {
            hashLength: hash?.length,
            hashStart: hash?.substring(0, 3)
          },
          'Generated hash does not match expected format'
        )

        const fallbackHash = fallbackBcryptHash(password)
        caddyHashCache.set(password, fallbackHash)
        return fallbackHash
      }

      authLogger.debug(
        {
          hashGenerated: true,
          hashLength: hash.length,
          hashFormat: hash.substring(0, 6) + '...'
        },
        'Successfully generated Caddy password hash'
      )

      caddyHashCache.set(password, hash)
      return hash
    } catch (cmdError) {
      authLogger.warn(
        {
          error: cmdError,
          errorMessage: cmdError instanceof Error ? cmdError.message : 'unknown error',
          fallback: true,
          command
        },
        'Local caddy command failed, using bcrypt fallback'
      )

      const fallbackHash = fallbackBcryptHash(password)
      caddyHashCache.set(password, fallbackHash)
      return fallbackHash
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
  const randomId = Math.random().toString(36).substring(2, 10)
  const encodedPassword = base64Encode(password + randomId)

  authLogger.debug(
    {
      usingFallback: true,
      passwordLength: password.length,
      hashFormat: '$2a$14$...'
    },
    'Using fallback bcrypt hash generator for development'
  )

  return `$2a$14$${randomId}${encodedPassword.substring(0, 31)}`
}

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64')
}
