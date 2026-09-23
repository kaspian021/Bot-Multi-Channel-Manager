// Deterministic local Phase 4 walkthrough. It uses no DigiStore/payment API.
import { runMigrations } from '../src/infrastructure/database/migrations';
import { seedDatabase } from '../src/infrastructure/database/seed';
import { getDatabaseClient, resetDatabaseClientForTesting } from '../src/infrastructure/database/db-client';
import { DraftService } from '../src/application/services/draft-service';
import { SchedulerService } from '../src/application/services/scheduler-service';
import { getTelegramBotService } from '../src/infrastructure/telegram/telegram-bot-service';
import { EntitlementService } from '../src/application/services/entitlement-service';

async function main() {
  process.env.DEMO_MODE = 'true'; process.env.PAUSE_PUBLISHING = 'false';
  await runMigrations(); await seedDatabase(true);
  const db = getDatabaseClient();
  const accountId = process.env.DEMO_ACCOUNT_ID || 'acc-demo-001';
  const workspaceId = process.env.DEMO_WORKSPACE_ID || 'ws-demo-001';
  const channelId = 'ch-futurestack-001';
  const telegramUserId = process.env.TELEGRAM_OWNER_USER_ID || '987654321';
  const candidateId = `cand-ph4-demo-${Date.now()}`;
  await db.query(`DELETE FROM editorial_runtime_state WHERE channel_id=$1`, [channelId]);
  await db.query(`INSERT INTO content_candidates (id,workspace_id,channel_id,title,canonical_url,normalized_url,author,content_type,summary,extracted_claims,score_json,is_duplicate) VALUES ($1,$2,$3,'Phase 4 demo research result','https://example.com/phase4','https://example.com/phase4','Demo Research','NEWS','Stored demo research candidate',$4, '{}',FALSE)`, [candidateId,workspaceId,channelId,JSON.stringify(['verified stored fact'])]);
  const draft = await new DraftService().generateDraftFromCandidate(candidateId);
  await getTelegramBotService().handleUpdate({ update_id: Date.now(), callback_query: { id: 'ph4-approve', from: { id: Number(telegramUserId), is_bot: false, first_name: 'Demo owner' }, data: `APPROVE_DRAFT:${draft.id}` } });
  const scheduleId = await new SchedulerService().scheduleDraft(draft.id, new Date(Date.now() - 1000), 'phase4-demo');
  const published = await new SchedulerService().executeDueScheduledPosts();

  // Demonstrate expiry at publication time, then no catch-up after restoring.
  const blockedDraft = `draft-ph4-expiry-${Date.now()}`;
  await db.query(`INSERT INTO content_drafts (id,workspace_id,channel_id,topic,title,headline,body,explanation,why_it_matters,content_type,confidence_score,content_score,status,suggested_publish_time,sources,fact_check_items,quality_evaluation) VALUES ($1,$2,$3,'Demo','Expiry guard','Expiry guard','Body','Body','[]','NEWS',90,90,'APPROVED','now','[]','[]','{}')`, [blockedDraft,workspaceId,channelId]);
  const blockedScheduleId = await new SchedulerService().scheduleDraft(blockedDraft, new Date(Date.now() - 1000), 'phase4-demo');
  await db.query(`UPDATE entitlement_snapshots SET status='EXPIRED' WHERE account_id=$1 AND product_key=$2 AND is_active=TRUE`, [accountId,process.env.PRODUCT_KEY || 'ai-channel-manager']);
  EntitlementService.clearCacheForTesting();
  const expiredAttempt = await new SchedulerService().executeDueScheduledPosts();
  const blocked = await db.query('SELECT status,failure_reason FROM scheduled_posts WHERE id=$1',[blockedScheduleId]);
  await db.query(`UPDATE entitlement_snapshots SET status='ACTIVE' WHERE account_id=$1 AND product_key=$2 AND is_active=TRUE`, [accountId,process.env.PRODUCT_KEY || 'ai-channel-manager']);
  EntitlementService.clearCacheForTesting();
  const restoredAttempt = await new SchedulerService().executeDueScheduledPosts();
  const audits = await db.query(`SELECT action FROM audit_logs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 20`,[workspaceId]);
  console.log(JSON.stringify({
    demoAccount: accountId, workspaceId, telegramUserId, channelCount: (await db.query('SELECT count(*) AS count FROM channels WHERE workspace_id=$1',[workspaceId])).rows[0].count,
    draftId: draft.id, scheduleId, published: published.executed, usageEvents: (await db.query('SELECT count(*) AS count FROM usage_events WHERE account_id=$1',[accountId])).rows[0].count,
    blockedSchedule: { id: blockedScheduleId, status: blocked.rows[0]?.status, reason: blocked.rows[0]?.failure_reason, expiredAttempt: expiredAttempt.executed, restoredAttempt: restoredAttempt.executed },
    auditActions: audits.rows.map((a: any) => a.action),
  }, null, 2));
}
main().finally(() => resetDatabaseClientForTesting());
