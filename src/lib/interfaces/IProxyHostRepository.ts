import type { ProxyHost } from '$lib/models/proxyHost'

export interface IProxyHostRepository {
  getAll(): Promise<ProxyHost[]>
  getById(id: string): Promise<ProxyHost | undefined>
  create(proxyHost: Omit<ProxyHost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProxyHost>
  update(id: string, proxyHost: Partial<ProxyHost>): Promise<ProxyHost | undefined>
  delete(id: string): Promise<boolean>
}
