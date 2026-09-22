// ==============================================================
// Publishing Service — Section 35 & 36 Specification (Idempotent)
// ==============================================================

import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { getTelegramBotService } from '../../infrastructure/telegram/telegram-bot-service';
import { formatTelegramPost } from '../../domain/telegram-format';
import { validateTransition } from '../../domain/state-machine';
import { AuditService } from './audit-service';
import { AuditActorType, ChannelStatus, ContentDraft, DraftStatus } from '../../domain/types';
import { EntitlementGuard, EntitlementDeniedError } from './entitlement-service';

export class PublishingService {
  private entitlementGuard = new EntitlementGuard();

  /**
   * Publishes a draft idempotently to the target channel.
   */
  async publishDraft(
    draftId: string,
    options: {
      scheduledPostId?: string;
      idempotencyKey?: string;
      actorType?: AuditActorType;
      actorId?: string;
    } = {}
  ): Promise<{ success: boolean; telegramMessageId: number; error?: string }> {
    const db = getDatabaseClient();
    const bot = getTelegramBotService();
    const actorType = options.actorType || AuditActorType.AI_WORKER;
    const actorId = options.actorId || 'publishing-engine';

    // 1. Fetch Draft
    const draftRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [draftId]);
    if (draftRes.rowCount === 0) {
      throw new Error(`Draft ${draftId} not found`);
    }
    const rawDraft = draftRes.rows[0];

    // 2. Operational pause check (Section 68)
    if (process.env.PAUSE_PUBLISHING === 'true') {
      const reason = 'Publishing is paused via PAUSE_PUBLISHING=true';
      await AuditService.log(
        rawDraft.workspace_id,
        rawDraft.channel_id,
        actorType,
        actorId,
        'PUBLICATION_BLOCKED_PAUSED',
        'DRAFT',
        draftId,
        { reason }
      );
      return { success: false, telegramMessageId: 0, error: reason };
    }

    // 3. Channel Status Check (Section 69: Do not publish into PAUSED, ARCHIVED, ERROR)
    const chanRes = await db.query('SELECT * FROM channels WHERE id = $1', [rawDraft.channel_id]);
    const channel = chanRes.rows[0];
    if (channel.status !== ChannelStatus.ACTIVE) {
      const reason = `Channel is in non-active status: ${channel.status}`;
      return { success: false, telegramMessageId: 0, error: reason };
    }

    // 4. Re-check entitlement at publication time. An approved/scheduled draft
    // never carries an authorization grant into a later billing period.
    const workspace = await db.query<{ account_id: string | null }>('SELECT account_id FROM workspaces WHERE id = $1', [rawDraft.workspace_id]);
    const accountId = workspace.rows[0]?.account_id;
    try {
      if (!accountId) throw new EntitlementDeniedError('Workspace is not bound to an account; publication is fail-closed');
      await this.entitlementGuard.assert({
        accountId,
        workspaceId: rawDraft.workspace_id,
        channelId: rawDraft.channel_id,
        operation: 'PUBLISH',
        source: 'publishing-service',
        idempotencyKey: options.idempotencyKey || `publish:${draftId}`,
      });
    } catch (error: any) {
      const reason = error?.message || 'Entitlement denied';
      if (options.scheduledPostId) {
        await db.query("UPDATE scheduled_posts SET status = 'BLOCKED_ENTITLEMENT', failure_reason = $1, last_attempt_at = CURRENT_TIMESTAMP WHERE id = $2", [reason, options.scheduledPostId]);
        await AuditService.log(rawDraft.workspace_id, rawDraft.channel_id, actorType, actorId, 'SCHEDULE_BLOCKED_ENTITLEMENT', 'SCHEDULED_POST', options.scheduledPostId, { reason });
      }
      await AuditService.log(rawDraft.workspace_id, rawDraft.channel_id, actorType, actorId, 'ENTITLEMENT_DENIED', 'DRAFT', draftId, { reason, at: 'publish' });
      return { success: false, telegramMessageId: 0, error: reason };
    }

    // 5. Idempotency Check (Section 36): Check if already published
    const existingPub = await db.query('SELECT * FROM published_posts WHERE draft_id = $1', [draftId]);
    if (existingPub.rowCount > 0) {
      // Already published! Return existing message ID without sending duplicate to Telegram.
      return {
        success: true,
        telegramMessageId: existingPub.rows[0].telegram_message_id,
      };
    }

    // Validate State Transition
    validateTransition(rawDraft.status as DraftStatus, DraftStatus.PUBLISHED);

    const formattedDraft: ContentDraft = {
      ...rawDraft,
      sources: typeof rawDraft.sources === 'string' ? JSON.parse(rawDraft.sources) : rawDraft.sources,
      whyItMatters: typeof rawDraft.why_it_matters === 'string' ? JSON.parse(rawDraft.why_it_matters) : rawDraft.why_it_matters,
      factCheckItems: typeof rawDraft.fact_check_items === 'string' ? JSON.parse(rawDraft.fact_check_items) : rawDraft.fact_check_items,
    };

    // 5. Send to Telegram
    const targetChat = channel.telegram_chat_id;
    if (!targetChat) {
      return { success: false, telegramMessageId: 0, error: 'Channel is not linked to a Telegram chat' };
    }
    const pubResult = await bot.publishToChannel(targetChat, formattedDraft, options.idempotencyKey || `publish:${draftId}`);

    // 6. Persist Published Post & update status
    const pubId = `pub-${Date.now()}`;
    await db.query(
      `INSERT INTO published_posts (
        id, workspace_id, channel_id, draft_id, scheduled_post_id,
        telegram_message_id, telegram_chat_id, published_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        pubId,
        rawDraft.workspace_id,
        rawDraft.channel_id,
        draftId,
        options.scheduledPostId || null,
        pubResult.messageId,
        targetChat,
        formatTelegramPost(formattedDraft),
      ]
    );

    await db.query("UPDATE content_drafts SET status = 'PUBLISHED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [draftId]);

    if (options.scheduledPostId) {
      await db.query("UPDATE scheduled_posts SET status = 'PUBLISHED' WHERE id = $1", [options.scheduledPostId]);
    }

    // 7. Audit Log
    await AuditService.log(
      rawDraft.workspace_id,
      rawDraft.channel_id,
      actorType,
      actorId,
      'POST_PUBLISHED',
      'PUBLISHED_POST',
      pubId,
      {
        draftId,
        telegramMessageId: pubResult.messageId,
        chat: targetChat,
      }
    );

    return {
      success: true,
      telegramMessageId: pubResult.messageId,
    };
  }
}
