/**
 * Interface for user repository operations.
 * Defines the contract for user data access.
 * @module interfaces/IUserRepository
 */
import type { User } from '$lib/models/user'

/**
 * Interface for the user repository
 */
export interface IUserRepository {
  /**
   * Gets all users
   */
  getAll(): Promise<User[]>

  /**
   * Gets a user by ID
   *
   * @param id User ID
   */
  getById(id: number): Promise<User | undefined>

  /**
   * Gets a user by email
   *
   * @param email User email
   */
  getByEmail(email: string): Promise<User | undefined>

  /**
   * Creates a new user
   *
   * @param userData User data
   */
  create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>

  /**
   * Updates a user
   *
   * @param id User ID
   * @param userData Updated user data
   */
  update(id: number, userData: Partial<User>): Promise<User | undefined>

  /**
   * Deletes a user
   *
   * @param id User ID
   */
  delete(id: number): Promise<boolean>

  /**
   * Gets the total count of users
   */
  count(): Promise<number>
}
