// ==============================================================
// Phase 4 fair, multi-channel, plan-aware background orchestrator
// ==============================================================

import { getDatabaseClient } from '../database/db-client';
import { ResearchService } from '../../application/services/research-service';
import { DraftService } from '../../application/services/draft-service';
import { SchedulerService } from '../../application/services/scheduler-service';
import { EditorialPlanningService } from '../../application/services/editorial-planning-service';
import { EntitlementService } from '../../application/services/entitlement-service';
import { SubscriptionService } from '../../application/services/subscription-service';
import { EntitlementDeniedError } from '../../application/services/entitlement-service';

export interface OrchestrationResult { channelsConsidered: number; researched: number; planned: number; drafted: number; skipped: number; errors: number; published: number; }

export class BackgroundJobOrchestrator {
  private readonly research = new ResearchService();
  private readonly drafts = new DraftService();
  private readonly scheduler = new SchedulerService();
  private readonly planning = new EditorialPlanningService();
  private readonly entitlements = new EntitlementService();
  private isRunning = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private cursor = 0;

  async runScheduledPublishJob(): Promise<{ executed: number; failed: number }> { return this.scheduler.executeDueScheduledPosts(); }

  /** Compatibility entrypoint: process a channel only when supplied, otherwise a fair cycle. */
  async runResearchAndDraftJob(channelId?: string): Promise<{ candidatesFound: number; draftCreated?: boolean }> {
    const db = getDatabaseClient();
    if (!channelId) {
      const result = await this.runAutonomousCycle();
      return { candidatesFound: result.researched, draftCreated: result.drafted > 0 };
    }
    const row = await db.query<{ id: string; workspace_id: string; account_id: string }>(
      `SELECT c.id, c.workspace_id, w.account_id FROM channels c JOIN workspaces w ON w.id = c.workspace_id WHERE c.id = $1 AND c.status = 'ACTIVE'`, [channelId]
    );
    if (!row.rowCount || !row.rows[0].account_id) return { candidatesFound: 0 };
    return this.processChannel(row.rows[0]);
  }

  async runAutonomousCycle(maxChannels = Math.max(1, Number(process.env.WORKER_CHANNELS_PER_TICK || 10))): Promise<OrchestrationResult> {
    const published = await this.runScheduledPublishJob();
    await new SubscriptionService().applyDueDowngrades();
    const db = getDatabaseClient();
    const active = await db.query<{ id: string; workspace_id: string; account_id: string }>(
      `SELECT c.id, c.workspace_id, w.account_id FROM channels c JOIN workspaces w ON w.id = c.workspace_id
       WHERE c.status = 'ACTIVE' AND w.account_id IS NOT NULL ORDER BY c.id ASC`
    );
    const channels = active.rows;
    const result: OrchestrationResult = { channelsConsidered: 0, researched: 0, planned: 0, drafted: 0, skipped: 0, errors: 0, published: published.executed };
    if (!channels.length) return result;
    // Rotate stable order each tick so a noisy early channel cannot starve later
    // channels when capacity is bounded.
    const start = this.cursor % channels.length;
    const fair = [...channels.slice(start), ...channels.slice(0, start)].slice(0, Math.min(maxChannels, channels.length));
    this.cursor = (start + fair.length) % channels.length;
    for (const channel of fair) {
      result.channelsConsidered++;
      try {
        const one = await this.processChannel(channel);
        result.researched += one.candidatesFound > 0 ? 1 : 0;
        result.drafted += one.draftCreated ? 1 : 0;
        result.planned++;
      } catch (error) {
        if (error instanceof EntitlementDeniedError) result.skipped++; else { result.errors++; console.error(`[Worker] channel ${channel.id} failed`, error); }
      }
    }
    return result;
  }

  private async processChannel(channel: { id: string; workspace_id: string; account_id: string }): Promise<{ candidatesFound: number; draftCreated?: boolean }> {
    const db = getDatabaseClient();
    const entitlement = await this.entitlements.resolve(channel.account_id);
    if (!entitlement) throw new EntitlementDeniedError('No entitlement for active channel');
    const state = await db.query<{ last_researched_at: string | null }>('SELECT last_researched_at FROM editorial_runtime_state WHERE channel_id = $1', [channel.id]);
    const researchInterval = Math.max(60, Number(entitlement.limits.researchIntervalSeconds || Number(process.env.RESEARCH_INTERVAL_HOURS || 3) * 3600));
    const lastResearch = state.rows[0]?.last_researched_at ? new Date(state.rows[0].last_researched_at).getTime() : 0;
    let candidatesFound = 0;
    if (!lastResearch || Date.now() - lastResearch >= researchInterval * 1000) {
      const research = await this.research.executeResearchRun(channel.id);
      candidatesFound = research.candidatesFound;
      await db.query(
        `INSERT INTO editorial_runtime_state (channel_id, last_researched_at, updated_at) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (channel_id) DO UPDATE SET last_researched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`, [channel.id]
      );
    }
    const plan = await this.planning.buildDailyPlan({ accountId: channel.account_id, workspaceId: channel.workspace_id, channelId: channel.id });
    await this.planning.createStrategyRecommendation({ workspaceId: channel.workspace_id, channelId: channel.id });
    const pending = await db.query("SELECT 1 FROM content_drafts WHERE channel_id = $1 AND status IN ('PENDING_APPROVAL', 'APPROVED', 'SCHEDULED') LIMIT 1", [channel.id]);
    if (pending.rowCount || !plan.plannedCandidateIds.length) return { candidatesFound, draftCreated: false };
    if (!(await this.acquireGenerationLock(channel.id))) return { candidatesFound, draftCreated: false };
    try {
      // Re-read the candidate in its channel/workspace and let DraftService
      // enforce entitlement, daily usage, and generation floor again.
      const candidate = await db.query('SELECT id FROM content_candidates WHERE id = $1 AND channel_id = $2', [plan.plannedCandidateIds[0], channel.id]);
      if (!candidate.rowCount) return { candidatesFound, draftCreated: false };
      await this.drafts.generateDraftFromCandidate(candidate.rows[0].id);
      return { candidatesFound, draftCreated: true };
    } finally { await this.releaseGenerationLock(channel.id); }
  }

  private async acquireGenerationLock(channelId: string): Promise<boolean> {
    const db = getDatabaseClient();
    const lockKey = `worker-${process.pid}-${Date.now()}`;
    await db.query(`INSERT INTO editorial_runtime_state (channel_id, updated_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (channel_id) DO NOTHING`, [channelId]);
    const result = await db.query(
      `UPDATE editorial_runtime_state SET generation_lock_key = $1, generation_lock_until = CURRENT_TIMESTAMP + INTERVAL '10 minutes', updated_at = CURRENT_TIMESTAMP
       WHERE channel_id = $2 AND (generation_lock_until IS NULL OR generation_lock_until < CURRENT_TIMESTAMP) RETURNING channel_id`, [lockKey, channelId]
    );
    return result.rowCount > 0;
  }

  private async releaseGenerationLock(channelId: string): Promise<void> {
    await getDatabaseClient().query('UPDATE editorial_runtime_state SET generation_lock_key = NULL, generation_lock_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE channel_id = $1', [channelId]);
  }

  startPeriodicWorker(intervalMs = 30000): void {
    if (this.isRunning) return; this.isRunning = true;
    const tick = async () => { try { await this.runAutonomousCycle(); } catch (error) { console.error('[Worker] autonomous cycle failed:', error); } };
    void tick(); this.intervalTimer = setInterval(tick, intervalMs);
    console.log(`[Worker] plan-aware multi-channel orchestrator started (tick every ${intervalMs / 1000}s)`);
  }

  stopWorker(): void { if (this.intervalTimer) clearInterval(this.intervalTimer); this.intervalTimer = null; this.isRunning = false; }
}
let orchestratorInstance: BackgroundJobOrchestrator | null = null;
export function getBackgroundJobOrchestrator(): BackgroundJobOrchestrator { if (!orchestratorInstance) orchestratorInstance = new BackgroundJobOrchestrator(); return orchestratorInstance; }
