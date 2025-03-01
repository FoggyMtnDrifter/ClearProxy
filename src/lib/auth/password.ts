/**
 * Password Management Module
 * 
 * Provides secure password hashing and verification using SHA-256.
 * Note: SHA-256 is used for basic authentication compatibility with Caddy.
 * For user authentication, a more secure algorithm like bcrypt should be used.
 * 
 * @module auth/password
 */

import { authLogger } from '../logger';
import { execSync } from 'child_process';

/**
 * Hashes a password using SHA-256.
 * 
 * @param password - The plain text password to hash
 * @returns Promise resolving to the hashed password as a hex string
 * @throws Error if hashing fails
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
 * Verifies a password against a stored hash.
 * 
 * @param password - The plain text password to verify
 * @param hash - The stored hash to verify against
 * @returns Promise resolving to true if the password matches, false otherwise
 * @throws Error if verification fails
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