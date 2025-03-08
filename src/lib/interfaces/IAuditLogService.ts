import type { AuditLog } from '$lib/models/auditLog'

export interface IAuditLogService {
  getAllLogs(limit?: number): Promise<AuditLog[]>
  getLogsByHostId(hostId: string, limit?: number): Promise<AuditLog[]>
  logAccess(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>
}
