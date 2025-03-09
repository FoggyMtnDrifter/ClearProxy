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

interface CacheEntry<T> {
  data: T
  expiry: number
}

/**
 * Implementation of the IUserRepository interface.
 */
class UserRepository implements IUserRepository {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private readonly CACHE_TTL = 15 * 1000 // 15 seconds cache TTL (reduced from 60s)
  private readonly ALL_USERS_CACHE_KEY = 'all_users'

  /**
   * Gets a value from cache if it exists and is not expired
   *
   * @private
   * @template T - Type of cached data
   * @param {string} key - Cache key
   * @returns {T|null} Cached value or null if not found/expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Stores a value in the cache
   *
   * @private
   * @template T - Type of data to cache
   * @param {string} key - Cache key
   * @param {T} data - Data to cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL
    })
  }

  /**
   * Invalidates a specific cache entry or the entire cache
   *
   * @private
   * @param {string} [key] - Specific key to invalidate, or all if not provided
   */
  private invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Gets all users from the database
   *
   * @returns {Promise<User[]>} All users
   */
  async getAll(): Promise<User[]> {
    const cached = this.getFromCache<User[]>(this.ALL_USERS_CACHE_KEY)
    if (cached) return cached

    const allUsers = await db.select().from(users)

    this.setCache(this.ALL_USERS_CACHE_KEY, allUsers)

    return allUsers as User[]
  }

  /**
   * Gets a user by ID
   *
   * @param {number} id - The user ID
   * @returns {Promise<User|undefined>} The user or undefined if not found
   */
  async getById(id: number): Promise<User | undefined> {
    const cacheKey = `user_${id}`
    const cached = this.getFromCache<User>(cacheKey)
    if (cached) return cached

    const user = await db.select().from(users).where(eq(users.id, id)).limit(1).get()

    if (user) {
      this.setCache(cacheKey, user)
    }

    return user as User | undefined
  }

  /**
   * Gets a user by email
   *
   * @param {string} email - The user email
   * @returns {Promise<User|undefined>} The user or undefined if not found
   */
  async getByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim()
    const cacheKey = `email_${normalizedEmail}`
    const cached = this.getFromCache<User>(cacheKey)
    if (cached) return cached

    const user = await db.select().from(users).where(eq(users.email, email)).limit(1).get()

    if (user) {
      this.setCache(cacheKey, user)
      this.setCache(`user_${user.id}`, user)
    }

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

    this.invalidateCache()

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

    if (updatedUser) {
      this.invalidateCache(`user_${id}`)
      this.invalidateCache(this.ALL_USERS_CACHE_KEY)

      if (userData.email) {
        for (const key of this.cache.keys()) {
          if (key.startsWith('email_')) {
            this.invalidateCache(key)
          }
        }
      }
    }

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

    this.invalidateCache()

    return !!deletedUser
  }

  /**
   * Gets the total count of users
   *
   * @returns {Promise<number>} The total number of users
   */
  async count(): Promise<number> {
    const cacheKey = 'user_count'
    const cached = this.getFromCache<number>(cacheKey)
    if (cached !== null) return cached

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .get()

    const count = result?.count ?? 0

    const shortCountTTL = 5 * 1000
    this.cache.set(cacheKey, {
      data: count,
      expiry: Date.now() + shortCountTTL
    })

    return count
  }

  /**
   * Public method to manually invalidate cache
   *
   * @param {number} [userId] - Optional user ID to invalidate specific cache entry
   */
  public invalidateCacheFor(userId?: number): void {
    if (userId) {
      this.invalidateCache(`user_${userId}`)
    } else {
      this.invalidateCache()
    }
  }
}

export const userRepository = new UserRepository()
