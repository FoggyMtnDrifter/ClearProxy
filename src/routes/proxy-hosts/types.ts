/**
 * Type definitions for the proxy hosts management interface.
 * @module routes/proxy-hosts/types
 */

/**
 * Form data structure for proxy host creation and update operations.
 * Contains fields for operation status and error reporting.
 */
export type ProxyHostFormData = {
  success?: boolean
  error?: string
  details?: string
}
