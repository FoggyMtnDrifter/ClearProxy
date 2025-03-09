/**
 * Repository for proxy host database operations.
 * Handles CRUD operations for proxy hosts.
 * @module repositories/proxyHostRepository
 */
import { db } from '$lib/db'
import { proxyHosts } from '$lib/db/schema'
import { eq } from 'drizzle-orm'
import { fixNullObjectPasswords } from '$lib/db'
import type { ProxyHost, CreateProxyHostData } from '$lib/models/proxyHost'
import type { IProxyHostRepository } from '$lib/interfaces/IProxyHostRepository'

interface CacheEntry<T> {
  data: T
  expiry: number
}

/**
 * Implementation of the IProxyHostRepository interface.
 */
class ProxyHostRepository implements IProxyHostRepository {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private readonly CACHE_TTL = 10 * 1000 // 10 seconds cache TTL (reduced from 60s)
  private readonly ALL_HOSTS_CACHE_KEY = 'all_hosts'

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
   * Gets all proxy hosts from the database
   *
   * @returns {Promise<ProxyHost[]>} All proxy hosts
   */
  async getAll(): Promise<ProxyHost[]> {
    const cached = this.getFromCache<ProxyHost[]>(this.ALL_HOSTS_CACHE_KEY)
    if (cached) return cached

    const hosts = await db.select().from(proxyHosts).orderBy(proxyHosts.createdAt)
    const result = fixNullObjectPasswords(hosts) as ProxyHost[]

    this.setCache(this.ALL_HOSTS_CACHE_KEY, result)

    return result
  }

  /**
   * Gets a proxy host by ID
   *
   * @param {string} id - The proxy host ID
   * @returns {Promise<ProxyHost|undefined>} The proxy host or undefined if not found
   */
  async getById(id: string): Promise<ProxyHost | undefined> {
    const cacheKey = `host_${id}`
    const cached = this.getFromCache<ProxyHost>(cacheKey)
    if (cached) return cached

    const [host] = await db
      .select()
      .from(proxyHosts)
      .where(eq(proxyHosts.id, parseInt(id, 10)))
      .limit(1)

    if (!host) return undefined

    const result = fixNullObjectPasswords([host])[0] as ProxyHost

    this.setCache(cacheKey, result)

    return result
  }

  /**
   * Creates a new proxy host
   *
   * @param {Omit<ProxyHost, 'id' | 'createdAt' | 'updatedAt'>} proxyHost - The proxy host data
   * @returns {Promise<ProxyHost>} The created proxy host
   */
  async create(proxyHost: Omit<ProxyHost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProxyHost> {
    const [createdHost] = await db
      .insert(proxyHosts)
      .values(proxyHost as CreateProxyHostData)
      .returning()

    this.invalidateCache()

    return createdHost as ProxyHost
  }

  /**
   * Updates an existing proxy host
   *
   * @param {string} id - The proxy host ID
   * @param {Partial<ProxyHost>} proxyHost - The updated proxy host data
   * @returns {Promise<ProxyHost|undefined>} The updated proxy host or undefined if not found
   */
  async update(id: string, proxyHost: Partial<ProxyHost>): Promise<ProxyHost | undefined> {
    const updateData = {
      ...(proxyHost as Partial<CreateProxyHostData>),
      updatedAt: new Date()
    }

    const [updatedHost] = await db
      .update(proxyHosts)
      .set(updateData)
      .where(eq(proxyHosts.id, parseInt(id, 10)))
      .returning()

    this.invalidateCache(`host_${id}`)
    this.invalidateCache(this.ALL_HOSTS_CACHE_KEY)

    return (updatedHost as ProxyHost) || undefined
  }

  /**
   * Deletes a proxy host
   *
   * @param {string} id - The proxy host ID
   * @returns {Promise<boolean>} True if the host was deleted
   */
  async delete(id: string): Promise<boolean> {
    const [deletedHost] = await db
      .delete(proxyHosts)
      .where(eq(proxyHosts.id, parseInt(id, 10)))
      .returning({ id: proxyHosts.id })

    this.invalidateCache(`host_${id}`)
    this.invalidateCache(this.ALL_HOSTS_CACHE_KEY)

    return !!deletedHost
  }

  /**
   * Public method to manually invalidate cache
   *
   * @param {string} [hostId] - Optional host ID to invalidate specific cache entry
   */
  public invalidateCacheFor(hostId?: string): void {
    if (hostId) {
      this.invalidateCache(`host_${hostId}`)
    } else {
      this.invalidateCache(this.ALL_HOSTS_CACHE_KEY)
    }
  }
}

export const proxyHostRepository = new ProxyHostRepository()
