import type { AuditLog } from '$lib/models/auditLog'

export interface IAuditLogRepository {
  getAll(limit?: number): Promise<AuditLog[]>
  create(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>
  getByHostId(hostId: string, limit?: number): Promise<AuditLog[]>
}
