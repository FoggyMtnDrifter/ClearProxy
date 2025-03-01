/**
 * Type definitions for proxy host form handling.
 * Used for both creation and editing of proxy hosts.
 * 
 * @module proxy-hosts/types
 */

/**
 * Form data structure for proxy host operations.
 * Includes success/error states and detailed error information.
 */
export type ProxyHostFormData = {
  /** Indicates if the operation was successful */
  success?: boolean;
  /** General error message if operation failed */
  error?: string;
  /** Detailed error information (e.g., validation errors) */
  details?: string;
}; 