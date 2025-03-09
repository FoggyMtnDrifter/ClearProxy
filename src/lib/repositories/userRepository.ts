/**
 * Repository for user database operations.
 * Handles CRUD operations for users.
 * @module repositories/userRepository
 */
import { db } from '$lib/db'
import { users } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import type { User } from '$lib/models/user'
import type { IUserRepository } from '$lib/interfaces/IUserRepository'

/**
 * Implementation of the IUserRepository interface.
 */
class UserRepository implements IUserRepository {
  /**
   * Gets all users from the database
   *
   * @returns {Promise<User[]>} All users
   */
  async getAll(): Promise<User[]> {
    const allUsers = await db.select().from(users)
    return allUsers as User[]
  }

  /**
   * Gets a user by ID
   *
   * @param {number} id - The user ID
   * @returns {Promise<User|undefined>} The user or undefined if not found
   */
  async getById(id: number): Promise<User | undefined> {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1).get()
    return user as User | undefined
  }

  /**
   * Gets a user by email
   *
   * @param {string} email - The user email
   * @returns {Promise<User|undefined>} The user or undefined if not found
   */
  async getByEmail(email: string): Promise<User | undefined> {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1).get()
    return user as User | undefined
  }

  /**
   * Creates a new user
   *
   * @param {Omit<User, 'id' | 'createdAt' | 'updatedAt'>} userData - The user data
   * @returns {Promise<User>} The created user
   */
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [createdUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash: userData.passwordHash,
        name: userData.name,
        isAdmin: userData.isAdmin
      })
      .returning()

    return createdUser as User
  }

  /**
   * Updates an existing user
   *
   * @param {number} id - The user ID
   * @param {Partial<User>} userData - The updated user data
   * @returns {Promise<User|undefined>} The updated user or undefined if not found
   */
  async update(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...(userData.email !== undefined && { email: userData.email }),
        ...(userData.passwordHash !== undefined && { passwordHash: userData.passwordHash }),
        ...(userData.name !== undefined && { name: userData.name }),
        ...(userData.isAdmin !== undefined && { isAdmin: userData.isAdmin }),
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    return updatedUser as User | undefined
  }

  /**
   * Deletes a user
   *
   * @param {number} id - The user ID
   * @returns {Promise<boolean>} True if the user was deleted
   */
  async delete(id: number): Promise<boolean> {
    const [deletedUser] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
    return !!deletedUser
  }

  /**
   * Gets the total count of users
   *
   * @returns {Promise<number>} The total number of users
   */
  async count(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .get()

    return result?.count ?? 0
  }
}

export const userRepository = new UserRepository()
