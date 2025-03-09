/**
 * Validation middleware.
 * Provides request validation logic for SvelteKit routes.
 * @module middleware/validation
 */
import { fail } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { apiLogger } from '$lib/utils/logger'
import * as validate from '$lib/utils/validation'

/**
 * Type for form field values
 */
export type FormFieldValue = string | File | null | undefined

/**
 * Interface for field validation rules
 */
export interface ValidationRule {
  required?: boolean
  validate?: (value: FormFieldValue) => boolean
  message: string
}

/**
 * Interface for validation rules by field
 */
export interface ValidationRules {
  [field: string]: ValidationRule
}

/**
 * Validates form data against validation rules
 * Optimized version with early termination and caching
 *
 * @param {FormData} formData - The form data to validate
 * @param {ValidationRules} rules - Validation rules to apply
 * @returns {Record<string, string>} Object with validation errors or empty if valid
 */
export function validateFormData(
  formData: FormData,
  rules: ValidationRules
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const [field, rule] of Object.entries(rules)) {
    if (rule.required) {
      const value = formData.get(field)
      if (!validate.isNotEmpty(value?.toString())) {
        errors[field] = rule.message
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return errors
  }

  for (const [field, rule] of Object.entries(rules)) {
    if (errors[field]) continue

    const value = formData.get(field)

    if (!rule.required && !validate.isNotEmpty(value?.toString())) {
      continue
    }

    if (rule.validate && value !== null && !rule.validate(value)) {
      errors[field] = rule.message
    }
  }

  return errors
}

type ValidatorFunction = (
  event: RequestEvent
) => Promise<{ formData: FormData } | ReturnType<typeof fail>>

const validatorCache = new Map<string, ValidatorFunction>()

/**
 * Creates a validation middleware function with optimized caching
 *
 * @param {ValidationRules} rules - Validation rules to apply
 * @returns {Function} Middleware function for validation
 */
export function createValidator(rules: ValidationRules) {
  const ruleKey = JSON.stringify(
    Object.entries(rules).map(([field, rule]) => ({
      field,
      required: !!rule.required,
      hasValidator: !!rule.validate
    }))
  )

  if (validatorCache.has(ruleKey)) {
    return validatorCache.get(ruleKey)!
  }

  const validator = async (event: RequestEvent) => {
    const { request } = event

    try {
      const formData = await request.formData()
      const errors = validateFormData(formData, rules)

      if (Object.keys(errors).length > 0) {
        apiLogger.debug(
          { errors, formData: Object.fromEntries(formData) },
          'Validation failed for request'
        )

        return fail(400, {
          errors,
          values: Object.fromEntries(formData)
        })
      }

      return { formData }
    } catch (error) {
      apiLogger.error({ error }, 'Error occurred during validation')

      return fail(400, {
        errors: {
          _form: 'Invalid form submission'
        }
      })
    }
  }

  validatorCache.set(ruleKey, validator)

  return validator
}

/**
 * Proxy host validation rules
 */
export const proxyHostRules: ValidationRules = {
  domain: {
    required: true,
    validate: (value) => typeof value === 'string' && validate.isValidDomain(value),
    message: 'Please enter a valid domain name'
  },
  targetHost: {
    required: true,
    validate: (value) => typeof value === 'string' && validate.isValidHostname(value),
    message: 'Please enter a valid target hostname'
  },
  targetPort: {
    required: true,
    validate: (value) => {
      const port = typeof value === 'string' ? Number(value) : NaN
      return validate.isValidPort(port)
    },
    message: 'Please enter a valid port number (1-65535)'
  },
  basicAuthUsername: {
    validate: (value) => typeof value === 'string' && validate.isNotEmpty(value),
    message: 'Username is required when basic authentication is enabled'
  },
  basicAuthPassword: {
    validate: (value) => typeof value === 'string' && validate.isNotEmpty(value),
    message: 'Password is required when basic authentication is enabled'
  }
}
