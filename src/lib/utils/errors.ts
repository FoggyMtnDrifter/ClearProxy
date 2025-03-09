/**
 * Custom error classes and error handling utilities
 * @module utils/errors
 */
import { apiLogger } from '$lib/utils/logger'

/**
 * Base class for application errors
 */
export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 500) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error for when a resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404)
  }
}

/**
 * Error for when the request is invalid
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400)
  }
}

/**
 * Error for when the user is unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

/**
 * Error for when the user doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403)
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  errors: Record<string, string>

  constructor(message: string, errors: Record<string, string> = {}) {
    super(message, 400)
    this.errors = errors
  }
}

/**
 * Error for Caddy server issues
 */
export class CaddyError extends AppError {
  constructor(message: string) {
    super(message, 503)
  }
}

/**
 * Type for error log info
 */
interface ErrorLogInfo {
  name: string
  message: string
  stack?: string
  context: string
  statusCode?: number
  validationErrors?: Record<string, string>
}

/**
 * Logs an error with appropriate metadata
 *
 * @param {Error} error - The error to log
 * @param {string} context - Additional context for the error
 */
export function logError(error: Error, context: string = ''): void {
  const errorInfo: ErrorLogInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context
  }

  if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode
  }

  if (error instanceof ValidationError) {
    errorInfo.validationErrors = error.errors
  }

  apiLogger.error(errorInfo, `Error occurred: ${error.message}`)
}

/**
 * Wraps a function to catch and log errors
 *
 * @template T
 * @param {function(): Promise<T>} fn - The async function to wrap
 * @param {string} context - Context description for error logging
 * @returns {Promise<T>} The function result or throws an error
 */
export async function withErrorHandling<T>(fn: () => Promise<T>, context: string): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), context)
    throw error
  }
}

/**
 * Formats an error response
 */
export function formatErrorResponse(error: Error) {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message
      }
    }
  }

  return {
    status: 500,
    body: {
      error: 'Internal server error'
    }
  }
}
