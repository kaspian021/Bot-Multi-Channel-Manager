// ==============================================================
// Scheduler Service — Section 26 & 48 Specification
// ==============================================================

import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { PublishingService } from './publishing-service';
import { AuditService } from './audit-service';
import { AuditActorType, DraftStatus } from '../../domain/types';
import { validateTransition } from '../../domain/state-machine';

export class SchedulerService {
  private publishingService = new PublishingService();

  /**
   * Schedules an approved draft for future publishing.
   */
  async scheduleDraft(draftId: string, scheduledFor: Date | string, actorId = 'owner'): Promise<string> {
    const db = getDatabaseClient();

    const draftRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [draftId]);
    if (draftRes.rowCount === 0) {
      throw new Error(`Draft ${draftId} not found`);
    }
    const draft = draftRes.rows[0];

    validateTransition(draft.status as DraftStatus, DraftStatus.SCHEDULED);

    const schedId = `sched-${Date.now()}`;
    const scheduledDateStr = typeof scheduledFor === 'string' ? scheduledFor : scheduledFor.toISOString();
    const idempotencyKey = `idemp-${draftId}`;

    await db.query(
      `INSERT INTO scheduled_posts (id, workspace_id, channel_id, draft_id, scheduled_for, status, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
       ON CONFLICT (idempotency_key) DO UPDATE
       SET scheduled_for = EXCLUDED.scheduled_for, status = 'PENDING'`,
      [schedId, draft.workspace_id, draft.channel_id, draftId, scheduledDateStr, idempotencyKey]
    );

    await db.query("UPDATE content_drafts SET status = 'SCHEDULED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [draftId]);

    await AuditService.log(
      draft.workspace_id,
      draft.channel_id,
      AuditActorType.OWNER,
      actorId,
      'POST_SCHEDULED',
      'SCHEDULED_POST',
      schedId,
      { scheduledFor: scheduledDateStr }
    );

    return schedId;
  }

  /**
   * Evaluates and publishes pending posts whose scheduled time has arrived.
   */
  async executeDueScheduledPosts(): Promise<{ executed: number; failed: number }> {
    const db = getDatabaseClient();
    const nowIso = new Date().toISOString();

    const dueRes = await db.query(
      "SELECT * FROM scheduled_posts WHERE status = 'PENDING' AND scheduled_for <= $1 ORDER BY scheduled_for ASC",
      [nowIso]
    );

    let executed = 0;
    let failed = 0;

    for (const post of dueRes.rows) {
      try {
        const result = await this.publishingService.publishDraft(post.draft_id, {
          scheduledPostId: post.id,
          idempotencyKey: post.idempotency_key,
        });

        if (result.success) {
          executed++;
        } else {
          failed++;
          await db.query(
            "UPDATE scheduled_posts SET retry_count = retry_count + 1, failure_reason = $1, last_attempt_at = CURRENT_TIMESTAMP WHERE id = $2",
            [result.error || 'Publish failed', post.id]
          );
        }
      } catch (err: any) {
        failed++;
        await db.query(
          "UPDATE scheduled_posts SET retry_count = retry_count + 1, failure_reason = $1, last_attempt_at = CURRENT_TIMESTAMP WHERE id = $2",
          [err?.message || 'Unexpected failure', post.id]
        );
      }
    }

    return { executed, failed };
  }
}
