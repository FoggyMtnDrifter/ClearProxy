/**
 * Validation utility functions.
 * Provides helpers for validating user input and form data.
 * @module utils/validation
 */

const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
const HOSTNAME_REGEX =
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * Validates a domain name
 *
 * @param {string} domain - The domain to validate
 * @returns {boolean} True if the domain is valid
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false
  }

  return DOMAIN_REGEX.test(domain)
}

/**
 * Validates a hostname
 *
 * @param {string} hostname - The hostname to validate
 * @returns {boolean} True if the hostname is valid
 */
export function isValidHostname(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') {
    return false
  }

  return HOSTNAME_REGEX.test(hostname)
}

/**
 * Validates a port number
 *
 * @param {number} port - The port to validate
 * @returns {boolean} True if the port is valid
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * Validates email address format
 *
 * @param {string} email - The email to validate
 * @returns {boolean} True if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const normalizedEmail = email.toLowerCase().trim()
  return EMAIL_REGEX.test(normalizedEmail)
}

/**
 * Validates that a value is not empty
 *
 * @param {string|undefined|null} value - The value to check
 * @returns {boolean} True if the value is not empty
 */
export function isNotEmpty(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Validates password strength
 *
 * @param {string} password - The password to validate
 * @returns {boolean} True if the password meets strength requirements
 */
export function isStrongPassword(password: string): boolean {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return false
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  return hasUppercase && hasLowercase && hasNumber && hasSpecial
}
