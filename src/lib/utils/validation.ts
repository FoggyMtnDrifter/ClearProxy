/**
 * Validation utility functions.
 * Provides helpers for validating user input and form data.
 * @module utils/validation
 */

/**
 * Validates a domain name
 *
 * @param {string} domain - The domain to validate
 * @returns {boolean} True if the domain is valid
 */
export function isValidDomain(domain: string): boolean {
  // Simple domain validation regex
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
  return domainRegex.test(domain)
}

/**
 * Validates a hostname
 *
 * @param {string} hostname - The hostname to validate
 * @returns {boolean} True if the hostname is valid
 */
export function isValidHostname(hostname: string): boolean {
  // Allow IP addresses or domain names without protocol
  const hostnameRegex =
    /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
  return hostnameRegex.test(hostname)
}

/**
 * Validates a port number
 *
 * @param {number} port - The port to validate
 * @returns {boolean} True if the port is valid
 */
export function isValidPort(port: number): boolean {
  return port >= 1 && port <= 65535
}

/**
 * Validates email address format
 *
 * @param {string} email - The email to validate
 * @returns {boolean} True if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Validates that a value is not empty
 *
 * @param {string|undefined|null} value - The value to check
 * @returns {boolean} True if the value is not empty
 */
export function isNotEmpty(value: string | undefined | null): boolean {
  return !!value && value.trim() !== ''
}

/**
 * Validates password strength
 *
 * @param {string} password - The password to validate
 * @returns {boolean} True if the password meets strength requirements
 */
export function isStrongPassword(password: string): boolean {
  // At least 8 characters with a mix of letters, numbers, and special characters
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}
