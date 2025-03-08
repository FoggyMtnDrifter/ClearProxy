import type { ProxyHost } from '$lib/models/proxyHost'

export interface IProxyHostService {
  getAllProxyHosts(): Promise<ProxyHost[]>
  getProxyHostById(id: string): Promise<ProxyHost | undefined>
  createProxyHost(proxyHost: Omit<ProxyHost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProxyHost>
  updateProxyHost(id: string, proxyHost: Partial<ProxyHost>): Promise<ProxyHost | undefined>
  deleteProxyHost(id: string): Promise<boolean>
  refreshCaddyConfig(): Promise<void>
}
