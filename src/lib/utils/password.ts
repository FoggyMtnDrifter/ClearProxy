/**
 * Password utility functions.
 * Provides functions for generating hashes, comparing passwords, and related security operations.
 * @module utils/password
 */

import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

/**
 * Generates a random salt string
 *
 * @returns {string} Random salt string
 */
export function generateSalt(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Hashes a password with a salt using scrypt algorithm
 *
 * @param {string} password - The plain text password to hash
 * @param {string} salt - The salt to use for hashing
 * @returns {Promise<string>} The derived hash
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return derivedKey.toString('hex')
}

/**
 * Generates a Caddy-compatible hash for basic authentication
 *
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The Caddy-compatible hash
 */
export async function generateCaddyHash(password: string): Promise<string> {
  const salt = generateSalt()
  const hash = await hashPassword(password, salt)
  return `$scrypt$${salt}$${hash}`
}

/**
 * Verifies a password against a stored hash
 *
 * @param {string} providedPassword - The password to verify
 * @param {string} storedSalt - The salt used in the original hash
 * @param {string} storedHash - The stored hash to compare against
 * @returns {Promise<boolean>} True if the password is valid
 */
export async function verifyPassword(
  providedPassword: string,
  storedSalt: string,
  storedHash: string
): Promise<boolean> {
  const derivedKey = (await scryptAsync(providedPassword, storedSalt, 64)) as Buffer
  const storedHashBuffer = Buffer.from(storedHash, 'hex')

  if (derivedKey.length !== storedHashBuffer.length) {
    return false
  }

  return timingSafeEqual(derivedKey, storedHashBuffer)
}
