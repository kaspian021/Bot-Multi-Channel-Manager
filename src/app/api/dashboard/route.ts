import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { EntitlementService, UsageMeter } from '@/application/services/entitlement-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const context = await tenantFor(req);
    const db = getDatabaseClient();
    const entitlement = await new EntitlementService().resolve(context.accountId);
    const [channelCount, pendingDrafts, scheduledCount, publishedCount, researchCount, recentDrafts, recentAudit, recentScheduled, telegram, plan, learning, subscription, runtime] = await Promise.all([
      db.query("SELECT count(*) as count FROM channels WHERE workspace_id = $1 AND status = 'ACTIVE'", [context.workspaceId]),
      db.query("SELECT count(*) as count FROM content_drafts WHERE workspace_id = $1 AND status = 'PENDING_APPROVAL'", [context.workspaceId]),
      db.query("SELECT count(*) as count FROM scheduled_posts WHERE workspace_id = $1 AND status = 'PENDING'", [context.workspaceId]),
      db.query('SELECT count(*) as count FROM published_posts WHERE workspace_id = $1', [context.workspaceId]),
      db.query('SELECT count(*) as count FROM research_runs WHERE workspace_id = $1', [context.workspaceId]),
      db.query('SELECT * FROM content_drafts WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 5', [context.workspaceId]),
      db.query('SELECT * FROM audit_logs WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 10', [context.workspaceId]),
      db.query(`SELECT sp.*, cd.headline, cd.topic FROM scheduled_posts sp LEFT JOIN content_drafts cd ON sp.draft_id = cd.id WHERE sp.workspace_id = $1 AND sp.status = 'PENDING' ORDER BY sp.scheduled_for ASC LIMIT 5`, [context.workspaceId]),
      db.query('SELECT * FROM telegram_identities WHERE account_id = $1 AND status = $2', [context.accountId, 'ACTIVE']),
      db.query(`SELECT ep.* FROM editorial_plans ep JOIN channels c ON c.id = ep.channel_id WHERE c.workspace_id = $1 AND ep.plan_date = CURRENT_DATE ORDER BY ep.generated_at DESC LIMIT 5`, [context.workspaceId]),
      db.query(`SELECT ele.* FROM editorial_learning_events ele JOIN channels c ON c.id = ele.channel_id WHERE c.workspace_id = $1 ORDER BY ele.created_at DESC LIMIT 10`, [context.workspaceId]),
      db.query('SELECT * FROM subscriptions WHERE account_id = $1 ORDER BY updated_at DESC LIMIT 1', [context.accountId]),
      db.query(`SELECT ers.* FROM editorial_runtime_state ers JOIN channels c ON c.id = ers.channel_id WHERE c.workspace_id = $1`, [context.workspaceId]),
    ]);
    const meter = new UsageMeter();
    const usage = entitlement ? {
      aiRequests: await meter.usageToday({ accountId: context.accountId, workspaceId: context.workspaceId, metric: 'AI_REQUEST' }),
      researchRuns: await meter.usageToday({ accountId: context.accountId, workspaceId: context.workspaceId, metric: 'RESEARCH_RUN' }),
      posts: await meter.usageToday({ accountId: context.accountId, workspaceId: context.workspaceId, metric: 'POST_PUBLISHED' }),
    } : {};
    return NextResponse.json({
      account: { id: context.accountId, role: context.role }, workspace: { id: context.workspaceId }, telegramIdentity: telegram.rows[0] || null,
      subscription: subscription.rows[0] || null, entitlement, usage, editorialPlans: plan.rows, learningSignals: learning.rows, runtime: runtime.rows,
      integrationHealth: { provider: process.env.ENTITLEMENT_PROVIDER || 'mock', cacheTtlSeconds: Number(process.env.ENTITLEMENT_CACHE_TTL_SECONDS || 60), remoteConfigured: Boolean(process.env.INTEGRATION_API_BASE_URL) },
      metrics: { activeChannels: Number(channelCount.rows[0]?.count || 0), pendingApprovals: Number(pendingDrafts.rows[0]?.count || 0), scheduledPosts: Number(scheduledCount.rows[0]?.count || 0), publishedPosts: Number(publishedCount.rows[0]?.count || 0), totalResearchRuns: Number(researchCount.rows[0]?.count || 0) },
      recentDrafts: recentDrafts.rows, recentScheduled: recentScheduled.rows, recentAuditLogs: recentAudit.rows,
      demoMode: process.env.DEMO_MODE === 'true', pausePublishing: process.env.PAUSE_PUBLISHING === 'true',
    });
  } catch (error) { return apiError(error, 'Failed to fetch dashboard data'); }
}
