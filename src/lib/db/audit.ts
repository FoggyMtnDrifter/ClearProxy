import { db } from './index';
import { auditLogs } from './schema';

export interface CreateAuditLogParams {
  actionType: 'create' | 'update' | 'delete' | 'toggle';
  entityType: string;
  entityId?: number;
  changes: Record<string, any>;
  userId?: string;
}

/**
 * Creates an audit log entry in the database
 * @param params The audit log parameters
 * @returns The created audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const { actionType, entityType, entityId, changes, userId } = params;

  return await db.insert(auditLogs).values({
    actionType,
    entityType,
    entityId,
    changes: JSON.stringify(changes),
    userId,
    createdAt: new Date()
  });
} 