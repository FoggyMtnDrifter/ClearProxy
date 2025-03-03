import { db } from './index'
import { auditLogs } from './schema'

export interface CreateAuditLogParams {
  actionType: 'create' | 'update' | 'delete' | 'toggle'
  entityType: string
  entityId?: number
  changes: Record<string, unknown>
  userId?: number
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const { actionType, entityType, entityId, changes, userId } = params

  return await db.insert(auditLogs).values({
    actionType,
    entityType,
    entityId,
    changes: JSON.stringify(changes),
    userId,
    createdAt: new Date()
  })
}
