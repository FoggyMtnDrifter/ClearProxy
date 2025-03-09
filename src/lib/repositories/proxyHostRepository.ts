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

/**
 * Implementation of the IProxyHostRepository interface.
 */
class ProxyHostRepository implements IProxyHostRepository {
  /**
   * Gets all proxy hosts from the database
   *
   * @returns {Promise<ProxyHost[]>} All proxy hosts
   */
  async getAll(): Promise<ProxyHost[]> {
    const hosts = await db.select().from(proxyHosts).orderBy(proxyHosts.createdAt)
    const result = fixNullObjectPasswords(hosts) as ProxyHost[]
    return result
  }

  /**
   * Gets a proxy host by ID
   *
   * @param {string} id - The proxy host ID
   * @returns {Promise<ProxyHost|undefined>} The proxy host or undefined if not found
   */
  async getById(id: string): Promise<ProxyHost | undefined> {
    const [host] = await db
      .select()
      .from(proxyHosts)
      .where(eq(proxyHosts.id, parseInt(id, 10)))
      .limit(1)

    if (!host) return undefined

    const result = fixNullObjectPasswords([host])[0] as ProxyHost
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

    return !!deletedHost
  }
}

export const proxyHostRepository = new ProxyHostRepository()
