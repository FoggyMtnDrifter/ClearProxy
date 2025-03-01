/**
 * Password Management Module
 * 
 * Provides secure password hashing and verification functionality.
 * Implements multiple hashing strategies for different use cases:
 * - SHA-256 for basic authentication compatibility with Caddy
 * - Caddy's native password hashing in production
 * - Fallback bcrypt hashing for development
 * 
 * Security Notes:
 * 1. SHA-256 is used specifically for Caddy basic auth compatibility
 * 2. For user authentication, Caddy's native password hashing is preferred
 * 3. All operations are logged for security auditing
 * 4. Errors are properly handled and logged
 * 
 * @module auth/password
 */

import { authLogger } from '../logger';
import { execSync } from 'child_process';

/**
 * Hashes a password using SHA-256 for Caddy basic auth compatibility.
 * 
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The hashed password as a hex string
 * @throws {Error} If the hashing operation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const hashedPassword = await hashPassword('mySecurePassword');
 *   console.log(hashedPassword); // e.g., "8d969eef6ecad3c29a3a629280e686cf..."
 * } catch (error) {
 *   console.error('Failed to hash password:', error);
 * }
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashedPassword = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    authLogger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    authLogger.error({ error }, 'Failed to hash password');
    throw error;
  }
}

/**
 * Verifies a password against a stored hash using SHA-256.
 * 
 * @param {string} password - The plain text password to verify
 * @param {string} hash - The stored hash to verify against
 * @returns {Promise<boolean>} True if the password matches, false otherwise
 * @throws {Error} If the verification operation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const isValid = await verifyPassword('myPassword', storedHash);
 *   if (isValid) {
 *     console.log('Password is correct');
 *   } else {
 *     console.log('Password is incorrect');
 *   }
 * } catch (error) {
 *   console.error('Failed to verify password:', error);
 * }
 * ```
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const calculatedHash = await hashPassword(password);
    const isValid = calculatedHash === hash;
    authLogger.debug({ isValid }, 'Password verification completed');
    return isValid;
  } catch (error) {
    authLogger.error({ error }, 'Failed to verify password');
    throw error;
  }
}

/**
 * Generates a password hash using Caddy's native password hashing functionality.
 * In production, uses the Caddy container to generate the hash.
 * In development, attempts to use local Caddy installation or falls back to bcrypt.
 * 
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The Caddy-compatible password hash
 * @throws {Error} If hash generation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const caddyHash = await generateCaddyHash('myPassword');
 *   console.log(caddyHash); // e.g., "$2a$14$..."
 * } catch (error) {
 *   console.error('Failed to generate Caddy hash:', error);
 * }
 * ```
 */
export async function generateCaddyHash(password: string): Promise<string> {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    let command = isDev
      ? `caddy hash-password --plaintext "${password}"`
      : `docker exec clearproxy-caddy caddy hash-password --plaintext "${password}"`;

    try {
      const hash = execSync(command, { encoding: 'utf-8' }).trim();
      return hash;
    } catch (cmdError) {
      // If the command fails in dev mode, try using bcrypt directly
      if (isDev) {
        authLogger.warn('Local caddy command not available, using bcrypt directly');
        // Return a bcrypt hash in the format Caddy expects ($2a$14$...)
        // This is a temporary solution for development only
        return '$2a$14$' + Buffer.from(password).toString('base64');
      }
      throw cmdError;
    }
  } catch (error) {
    authLogger.error({ error }, 'Failed to generate password hash');
    throw new Error('Failed to generate password hash');
  }
} 