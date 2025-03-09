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
  if (rows.length === 0) {
    return rows
  }

  if (rows.length === 1) {
    const row = rows[0]

    const needsFixing =
      ('basicAuthPassword' in row &&
        typeof row['basicAuthPassword'] === 'object' &&
        row['basicAuthPassword'] !== null) ||
      ('password' in row && typeof row['password'] === 'object' && row['password'] !== null)

    if (!needsFixing) {
      return rows
    }

    const fixedRow = { ...row } as Record<string, unknown>

    if (
      'basicAuthPassword' in fixedRow &&
      typeof fixedRow['basicAuthPassword'] === 'object' &&
      fixedRow['basicAuthPassword'] !== null
    ) {
      fixedRow['basicAuthPassword'] = ''
    }

    if (
      'password' in fixedRow &&
      typeof fixedRow['password'] === 'object' &&
      fixedRow['password'] !== null
    ) {
      fixedRow['password'] = ''
    }

    return [fixedRow as T]
  }

  return rows.map((row) => {
    const needsFixing =
      ('basicAuthPassword' in row &&
        typeof row['basicAuthPassword'] === 'object' &&
        row['basicAuthPassword'] !== null) ||
      ('password' in row && typeof row['password'] === 'object' && row['password'] !== null)

    if (!needsFixing) {
      return row
    }

    const fixedRow = { ...row } as Record<string, unknown>

    if (
      'basicAuthPassword' in fixedRow &&
      typeof fixedRow['basicAuthPassword'] === 'object' &&
      fixedRow['basicAuthPassword'] !== null
    ) {
      fixedRow['basicAuthPassword'] = ''
    }

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

/**
 * Batch process database operations for better performance
 * This is not a caching mechanism, but rather a way to process large datasets in smaller chunks
 * All data is processed directly without memory storage between operations
 *
 * @template T
 * @template R
 * @param {T[]} items - Items to process
 * @param {Function} processFn - Function to process each item
 * @param {number} batchSize - Number of items to process in each batch
 * @returns {Promise<R[]>} Results of processing
 */
export async function batchProcess<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize: number = 50
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processFn))
    results.push(...batchResults)
  }

  return results
}

/**
 * Execute a function with automatic retries for database operations
 *
 * @template T
 * @param {Function} fn - Function to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay between retries in ms
 * @returns {Promise<T>} Result of the function execution
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Operation failed after retries')
}
