/**
 * Type definitions for user data.
 * @module models/user
 */

/**
 * Represents a user in the system
 */
export interface User {
  id: number
  createdAt: Date | null
  updatedAt: Date | null
  email: string
  passwordHash: string
  name: string
  isAdmin: boolean
}

/**
 * Data required to create a new user
 */
export interface CreateUserData {
  email: string
  passwordHash: string
  name: string
  isAdmin?: boolean
}
