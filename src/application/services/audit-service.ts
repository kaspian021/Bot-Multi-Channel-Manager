// ==============================================================
// Audit Service — Section 34 Specification
// ==============================================================

import crypto from 'crypto';
import { getDatabaseClient, IDatabaseClient } from '../../infrastructure/database/db-client';
import { AuditActorType } from '../../domain/types';

export class AuditService {
  static async log(
    workspaceId: string,
    channelId: string | undefined,
    actorType: AuditActorType,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    db: IDatabaseClient = getDatabaseClient()
  ): Promise<void> {
    const id = `audit-${crypto.randomUUID()}`;

    await db.query(
      `INSERT INTO audit_logs (id, workspace_id, channel_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        workspaceId,
        channelId || null,
        actorType,
        actorId,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata || {}),
      ]
    );
  }
}
