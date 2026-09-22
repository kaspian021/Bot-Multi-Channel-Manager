// ==============================================================
// Phase 4 Editorial Planning, explainable trends & owner learning
// ==============================================================

import crypto from 'crypto';
import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { ChannelBrainService } from './channel-brain-service';
import { EntitlementGuard } from './entitlement-service';
import { AuditService } from './audit-service';
import { EditorialLearningAction, EditorialPlan } from '../../domain/types';

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const fromJson = <T>(value: unknown, fallback: T): T => { try { return typeof value === 'string' ? JSON.parse(value) : (value as T) || fallback; } catch { return fallback; } };

export interface TrendSignal { kind: 'EMERGING' | 'BREAKING' | 'MATERIAL_UPDATE' | 'RECURRING' | 'STALE' | 'OVER_COVERED' | 'UNDER_COVERED'; topic: string; reason: string; candidateIds: string[]; }

export class EditorialPlanningService {
  private brain = new ChannelBrainService();
  private guard = new EntitlementGuard();

  async detectTrends(channelId: string): Promise<TrendSignal[]> {
    const db = getDatabaseClient();
    const candidates = await db.query(
      `SELECT id, title, content_type, created_at, is_duplicate, duplicate_decision_reason
       FROM content_candidates WHERE channel_id = $1 ORDER BY created_at DESC LIMIT 100`, [channelId]
    );
    const published = await db.query(
      `SELECT topic, published_at FROM published_posts WHERE channel_id = $1 AND published_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`, [channelId]
    );
    const signals: TrendSignal[] = [];
    const typeCounts = new Map<string, Array<string>>();
    for (const candidate of candidates.rows.filter((row: any) => !row.is_duplicate)) {
      const key = String(candidate.content_type || 'NEWS');
      typeCounts.set(key, [...(typeCounts.get(key) || []), candidate.id]);
      if (candidate.duplicate_decision_reason?.includes('material')) {
        signals.push({ kind: 'MATERIAL_UPDATE', topic: key, reason: 'Stored duplicate classifier marked a material update.', candidateIds: [candidate.id] });
      }
    }
    for (const [topic, ids] of typeCounts) {
      if (ids.length >= 3) signals.push({ kind: 'EMERGING', topic, reason: `${ids.length} distinct recent stored candidates share this content type.`, candidateIds: ids.slice(0, 5) });
    }
    const publishedByTopic = new Map<string, number>();
    for (const post of published.rows) publishedByTopic.set(post.topic || 'Unknown', (publishedByTopic.get(post.topic || 'Unknown') || 0) + 1);
    for (const [topic, count] of publishedByTopic) {
      if (count >= 3) signals.push({ kind: 'OVER_COVERED', topic, reason: `${count} posts in the last seven days use this stored topic.`, candidateIds: [] });
    }
    return signals;
  }

  async buildDailyPlan(input: { accountId: string; workspaceId: string; channelId: string; force?: boolean }): Promise<EditorialPlan> {
    await this.guard.assert({ accountId: input.accountId, workspaceId: input.workspaceId, channelId: input.channelId, operation: 'STRATEGY', source: 'editorial-planner' });
    const db = getDatabaseClient();
    const date = new Date().toISOString().slice(0, 10);
    const existing = await db.query('SELECT * FROM editorial_plans WHERE channel_id = $1 AND plan_date = $2', [input.channelId, date]);
    if (existing.rowCount && !input.force) return this.mapPlan(existing.rows[0]);

    const channel = await db.query('SELECT * FROM channels WHERE id = $1 AND workspace_id = $2', [input.channelId, input.workspaceId]);
    if (!channel.rowCount) throw new Error('Channel not found in workspace');
    const brain = await this.brain.getBrain(input.channelId);
    const candidates = await db.query(
      `SELECT id, title, content_type, score_json FROM content_candidates
       WHERE channel_id = $1 AND is_duplicate = FALSE
       ORDER BY created_at DESC LIMIT 30`, [input.channelId]
    );
    const recent = await db.query(
      `SELECT topic, content_type FROM content_drafts WHERE channel_id = $1 AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`, [input.channelId]
    );
    const preferences = await db.query(
      `SELECT * FROM owner_preferences WHERE channel_id = $1 AND status = 'ACTIVE' ORDER BY CASE WHEN type = 'EXPLICIT' THEN 0 ELSE 1 END, confidence DESC`, [input.channelId]
    );
    const explicitRules = preferences.rows.filter((p: any) => p.type === 'EXPLICIT').map((p: any) => p.rule);
    const mix = brain?.content.contentMix || { News: 100 };
    const windows = brain?.publishing.preferredPublishingWindows || ['09:00', '14:00', '20:00'];
    const targetPosts = Math.min(Number(channel.rows[0].posting_frequency || 1), windows.length);
    const coveredTypes = new Set(recent.rows.map((item: any) => item.content_type));
    const sortedCandidates = [...candidates.rows].sort((a: any, b: any) => {
      const aBonus = coveredTypes.has(a.content_type) ? 0 : 1;
      const bBonus = coveredTypes.has(b.content_type) ? 0 : 1;
      return bBonus - aBonus;
    });
    const selected = sortedCandidates.slice(0, targetPosts);
    const topics = [...new Set(selected.map((candidate: any) => candidate.content_type || 'NEWS'))];
    const rationale = {
      explicitOwnerRules: explicitRules,
      inferredSignalsConsidered: preferences.rows.filter((p: any) => p.type === 'INFERRED').map((p: any) => ({ rule: p.rule, confidence: p.confidence })),
      contentMix: mix,
      diversity: 'Candidates in categories not recently drafted are ranked first; explicit rules are never replaced.',
      trends: await this.detectTrends(input.channelId),
      performanceData: 'unavailable unless imported or supplied by Telegram; no metrics were fabricated.',
    };
    const planId = existing.rows[0]?.id || id('plan');
    await db.query(
      `INSERT INTO editorial_plans (id, channel_id, plan_date, target_posts, content_mix_targets, selected_topics, preferred_windows, planned_candidate_ids, rationale_json, status, generated_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (channel_id, plan_date) DO UPDATE SET target_posts = EXCLUDED.target_posts, content_mix_targets = EXCLUDED.content_mix_targets,
        selected_topics = EXCLUDED.selected_topics, preferred_windows = EXCLUDED.preferred_windows, planned_candidate_ids = EXCLUDED.planned_candidate_ids,
        rationale_json = EXCLUDED.rationale_json, status = 'ACTIVE', generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      [planId, input.channelId, date, targetPosts, JSON.stringify(mix), JSON.stringify(topics), JSON.stringify(windows), JSON.stringify(selected.map((c: any) => c.id)), JSON.stringify(rationale)]
    );
    await db.query(
      `INSERT INTO editorial_runtime_state (channel_id, last_plan_at, updated_at) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (channel_id) DO UPDATE SET last_plan_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`, [input.channelId]
    );
    await AuditService.log(input.workspaceId, input.channelId, 'AI_WORKER' as any, 'editorial-planner', 'EDITORIAL_PLAN_CREATED', 'EDITORIAL_PLAN', planId, { date, targetPosts, selectedCandidateCount: selected.length });
    return this.mapPlan((await db.query('SELECT * FROM editorial_plans WHERE id = $1', [planId])).rows[0]);
  }

  async recordLearning(input: { workspaceId: string; channelId: string; draftId?: string; action: EditorialLearningAction; signalKey: string; signalValue: string; confidence?: number; metadata?: Record<string, unknown> }): Promise<void> {
    const db = getDatabaseClient();
    await db.query(
      `INSERT INTO editorial_learning_events (id, channel_id, draft_id, action, signal_key, signal_value, confidence, provenance, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OWNER_ACTION', $8)`,
      [id('learn'), input.channelId, input.draftId || null, input.action, input.signalKey, input.signalValue, input.confidence ?? 0.7, JSON.stringify(input.metadata || {})]
    );
    await AuditService.log(input.workspaceId, input.channelId, 'OWNER' as any, 'owner-learning', 'LEARNING_SIGNAL_RECORDED', 'EDITORIAL_LEARNING', input.draftId || input.channelId, { action: input.action, signalKey: input.signalKey, confidence: input.confidence ?? 0.7 });
  }

  async createStrategyRecommendation(input: { workspaceId: string; channelId: string }): Promise<string | null> {
    const trends = await this.detectTrends(input.channelId);
    const over = trends.find((trend) => trend.kind === 'OVER_COVERED');
    if (!over) return null;
    const db = getDatabaseClient();
    const recommendationId = id('rec');
    await db.query(
      `INSERT INTO strategy_recommendations (id, channel_id, title, category, current_value, recommended_value, reason, status)
       VALUES ($1, $2, $3, 'CONTENT_MIX', $4, $5, $6, 'PENDING')`,
      [recommendationId, input.channelId, `Diversify away from ${over.topic}`, JSON.stringify({ overCovered: over.topic }), JSON.stringify({ action: 'Review content mix; owner approval required' }), over.reason]
    );
    await AuditService.log(input.workspaceId, input.channelId, 'AI_WORKER' as any, 'editorial-planner', 'STRATEGY_RECOMMENDATION_CREATED', 'STRATEGY_RECOMMENDATION', recommendationId, { reason: over.reason });
    return recommendationId;
  }

  private mapPlan(row: any): EditorialPlan {
    return {
      id: row.id, channelId: row.channel_id, date: String(row.plan_date).slice(0, 10), targetPosts: Number(row.target_posts),
      contentMixTargets: fromJson(row.content_mix_targets, {}), selectedTopics: fromJson(row.selected_topics, []),
      preferredWindows: fromJson(row.preferred_windows, []), plannedCandidateIds: fromJson(row.planned_candidate_ids, []),
      status: row.status, generatedAt: new Date(row.generated_at).toISOString(), rationale: fromJson(row.rationale_json, {}),
    };
  }
}
