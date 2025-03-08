/**
 * Database utility functions.
 * Provides helper functions for database operations.
 * @module utils/db
 */

/**
 * Fixes null object passwords in database rows
 * Some database drivers may return passwords as null objects rather than strings
 * This function ensures passwords are properly formatted
 *
 * @template T
 * @param {T[]} rows - Database rows to process
 * @returns {T[]} Processed rows with fixed password fields
 */
export function fixNullObjectPasswords<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => {
    // Create a copy to avoid mutating the original
    const fixedRow = { ...row } as Record<string, unknown>

    // Handle basic auth password
    if (
      'basicAuthPassword' in fixedRow &&
      typeof fixedRow['basicAuthPassword'] === 'object' &&
      fixedRow['basicAuthPassword'] !== null
    ) {
      fixedRow['basicAuthPassword'] = ''
    }

    // Handle auth password
    if (
      'password' in fixedRow &&
      typeof fixedRow['password'] === 'object' &&
      fixedRow['password'] !== null
    ) {
      fixedRow['password'] = ''
    }

    return fixedRow as T
  })
}
