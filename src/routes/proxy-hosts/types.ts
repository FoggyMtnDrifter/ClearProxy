/**
 * Type definitions for the proxy hosts management interface.
 * @module routes/proxy-hosts/types
 */

/**
 * Form data structure for proxy host creation and update operations.
 * Contains fields for operation status and error reporting.
 */
export type ProxyHostFormData = {
  /** Whether the operation was successful */
  success?: boolean
  /** Error message if the operation failed */
  error?: string
  /** Additional details about the error, if any */
  details?: string
}
